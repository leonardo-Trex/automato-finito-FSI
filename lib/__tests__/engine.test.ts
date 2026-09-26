import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  computeHydrationMap,
  countNeighboringAdultTrees,
  hasActiveWaterNeighbor,
  countNearbyWaterCells,
  createCloud,
} from '../engine';
import { CellState, ClimateSeason } from '../types';
import {
  createBalancedForestPreset,
  createDegradedBasinPreset,
  createBaseGrid,
  createDrySoilPreset,
  PRESETS,
} from '../presets';
import { chebyshevDistance, manhattanDistance, getMooreNeighbors } from '../utils';

describe('Matemática e Utilitários de Grid', () => {
  it('calcula a distância Chebyshev corretamente', () => {
    expect(chebyshevDistance({ col: 5, row: 5 }, { col: 7, row: 6 })).toBe(2);
    expect(chebyshevDistance({ col: 10, row: 10 }, { col: 10, row: 13 })).toBe(3);
    expect(chebyshevDistance({ col: 2, row: 2 }, { col: 2, row: 2 })).toBe(0);
  });

  it('calcula a distância Manhattan corretamente', () => {
    expect(manhattanDistance({ col: 5, row: 5 }, { col: 7, row: 6 })).toBe(3);
    expect(manhattanDistance({ col: 0, row: 0 }, { col: 4, row: 3 })).toBe(7);
  });

  it('retorna os vizinhos de Moore válidos considerando limites', () => {
    const cornerNeighbors = getMooreNeighbors({ col: 0, row: 0 }, 10, 10);
    expect(cornerNeighbors.length).toBe(3);

    const centerNeighbors = getMooreNeighbors({ col: 5, row: 5 }, 10, 10);
    expect(centerNeighbors.length).toBe(8);
  });
});

describe('Difusão Hídrica e Mapa de Umidade', () => {
  it('marca células dentro do raio Chebyshev da água como hidratadas', () => {
    const grid = createBaseGrid(10, 10);
    // Coloca leito de água em (5, 5)
    grid[5][5].state = CellState.LEITO_AGUA;

    const radius = 2;
    const hydrated = computeHydrationMap(grid, radius, 10, 10);

    // Célula central e vizinhos no raio 2 devem estar hidratados
    expect(hydrated[5][5]).toBe(true);
    expect(hydrated[5 + 2][5 + 2]).toBe(true);
    expect(hydrated[5 - 2][5 - 2]).toBe(true);

    // Célula fora do raio 2 não deve estar hidratada
    expect(hydrated[5 + 3][5]).toBe(false);
    expect(hydrated[0][0]).toBe(false);
  });
});

describe('Motor de Simulação — Proteção da Mata Ciliar e Evaporação', () => {
  it('protege 100% o leito de água contra evaporação na SECA se houver >= 3 árvores adultas', () => {
    const grid = createBaseGrid(5, 5);
    const waterCoord = { col: 2, row: 2 };
    grid[2][2].state = CellState.LEITO_AGUA;

    // Adiciona exatamente 3 árvores adultas vizinhas
    grid[1][2].state = CellState.ARVORE_ADULTA;
    grid[3][2].state = CellState.ARVORE_ADULTA;
    grid[2][1].state = CellState.ARVORE_ADULTA;

    expect(countNeighboringAdultTrees(grid, waterCoord)).toBe(3);

    // Configura motor com alta taxa de evaporação (100%) na seca
    const engine = new SimulationEngine(grid, {
      evaporationProbabilityDry: 1.0,
      seasonDurationTicks: 100,
      waterRadius: 1,
    });
    engine.season = ClimateSeason.SECA;

    // Executa 10 ticks
    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    // Leito protegido permanece LEITO_AGUA
    expect(engine.grid[2][2].state).toBe(CellState.LEITO_AGUA);
  });

  it('evapora o leito de água na SECA se houver menos de 3 árvores adultas vizinhas', () => {
    const grid = createBaseGrid(5, 5);
    grid[2][2].state = CellState.LEITO_AGUA;

    // Apenas 1 árvore adulta (insuficiente para dossel de proteção)
    grid[1][2].state = CellState.ARVORE_ADULTA;

    const engine = new SimulationEngine(grid, {
      evaporationProbabilityDry: 1.0, // Garantir transição determinística no teste
      seasonDurationTicks: 100,
      waterRadius: 1,
    });
    engine.season = ClimateSeason.SECA;

    engine.step();

    // Deve ter evaporado para LEITO_SECO
    expect(engine.grid[2][2].state).toBe(CellState.LEITO_SECO);
  });

  it('regenera LEITO_SECO adjacente a LEITO_AGUA na estação CHUVOSA', () => {
    const grid = createBaseGrid(5, 5);
    grid[2][2].state = CellState.LEITO_SECO;
    grid[2][1].state = CellState.LEITO_AGUA; // vizinho ativo

    expect(hasActiveWaterNeighbor(grid, { col: 2, row: 2 })).toBe(true);

    const engine = new SimulationEngine(grid, {
      recoveryProbabilityRain: 1.0, // Garantir recuperação determinística no teste
      seasonDurationTicks: 100,
      waterRadius: 1,
    });
    engine.season = ClimateSeason.CHUVOSA;

    engine.step();

    expect(engine.grid[2][2].state).toBe(CellState.LEITO_AGUA);
  });
});

describe('Motor de Simulação — Germinação Seletiva e Sobrevivência', () => {
  it('germina semente em SOLO_FERTIL para BROTO e depois amadurece para ARVORE_ADULTA', () => {
    const grid = createBaseGrid(5, 5);
    // Rio na coluna 0 para garantir que coluna 1 seja solo fértil
    grid[2][0].state = CellState.LEITO_AGUA;

    const engine = new SimulationEngine(grid, {
      waterRadius: 2,
      seedToSproutTicks: 3,
      sproutToTreeTicks: 4,
    });

    // Coloca semente na célula (1, 2) que está a 1 de distância do rio
    engine.grid[2][1].state = CellState.SEMENTE;
    engine.grid[2][1].age = 0;

    // Avança 3 ticks -> deve germinar para broto
    for (let i = 0; i < 3; i++) {
      engine.step();
    }
    expect(engine.grid[2][1].state).toBe(CellState.BROTO);
    expect(engine.seedsGerminated).toBe(1);

    // Avança mais 4 ticks -> deve amadurecer para árvore adulta
    for (let i = 0; i < 4; i++) {
      engine.step();
    }
    expect(engine.grid[2][1].state).toBe(CellState.ARVORE_ADULTA);
  });

  it('degrada semente em SOLO_SECO para SOLO_SECO após K ciclos sem vingar', () => {
    const grid = createBaseGrid(10, 10);
    // Sem nenhuma água por perto
    const engine = new SimulationEngine(grid, {
      waterRadius: 1,
      seedDecayCycles: 5,
    });

    engine.grid[5][5].state = CellState.SEMENTE;
    engine.grid[5][5].age = 0;

    for (let i = 0; i < 5; i++) {
      engine.step();
    }

    // A semente pereceu no solo seco
    expect(engine.grid[5][5].state).toBe(CellState.SOLO_SECO);
    expect(engine.seedsLost).toBe(1);
    expect(engine.seedsGerminated).toBe(0);
  });

  it('mata o broto se o solo ao redor desidratar', () => {
    const grid = createBaseGrid(5, 5);
    const engine = new SimulationEngine(grid, {
      waterRadius: 1,
    });

    // Broto colocado em solo seco (sem água)
    engine.grid[2][2].state = CellState.BROTO;
    engine.step();

    // Broto morre e vira SOLO_SECO
    expect(engine.grid[2][2].state).toBe(CellState.SOLO_SECO);
  });
});

describe('Sazonalidade Climática e Métricas', () => {
  it('alterna estação climática após seasonDurationTicks', () => {
    const engine = new SimulationEngine(createBaseGrid(), {
      seasonDurationTicks: 10,
    });

    expect(engine.season).toBe(ClimateSeason.CHUVOSA);

    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    expect(engine.season).toBe(ClimateSeason.SECA);

    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    expect(engine.season).toBe(ClimateSeason.CHUVOSA);
  });

  it('calcula métricas do Preset Mata Nativa com alta preservação e densidade', () => {
    const grid = createBalancedForestPreset();
    const engine = new SimulationEngine(grid);

    const metrics = engine.getMetrics();
    expect(metrics.activeRiverCells).toBeGreaterThan(25);
    expect(metrics.dryRiverCells).toBe(0);
    expect(metrics.riverPreservationPct).toBe(100);
    expect(metrics.adultTreeCount).toBeGreaterThan(40);
    expect(metrics.riparianDensityPct).toBeGreaterThan(90);
  });

  it('calcula métricas do Preset Bacia Degradada com 0 árvores', () => {
    const grid = createDegradedBasinPreset();
    const engine = new SimulationEngine(grid);

    const metrics = engine.getMetrics();
    expect(metrics.activeRiverCells).toBeGreaterThan(25);
    expect(metrics.adultTreeCount).toBe(0);
    expect(metrics.riparianDensityPct).toBe(0);
  });
});

describe('Agentes Dispersores e Ferramentas Interativas', () => {
  it('permite que dispersor colete semente ao sobrevoar árvore adulta e a deposite no solo', () => {
    const grid = createBaseGrid(10, 10);
    grid[5][5].state = CellState.ARVORE_ADULTA;

    const engine = new SimulationEngine(grid, {
      disperserCount: 1,
      disperserDropProbability: 1.0, // Garantir drop determinístico
    });

    const disperser = engine.dispersers[0];
    disperser.x = 5 * 20 + 10;
    disperser.y = 5 * 20 + 10;
    disperser.hasSeed = false;
    disperser.seedCooldown = 0;

    // Atualiza movimento sobre a árvore -> deve colher semente
    engine.updateDispersersMotion();
    expect(disperser.hasSeed).toBe(true);

    // Move dispersor para solo seco em (2, 2)
    disperser.x = 2 * 20 + 10;
    disperser.y = 2 * 20 + 10;

    // Executa tick com chance 100% de drop
    engine.step();

    // Deve ter depositado a semente na célula (2, 2)
    expect(engine.grid[2][2].state).toBe(CellState.SEMENTE);
    expect(disperser.hasSeed).toBe(false);
    expect(engine.totalSeedsDropped).toBe(1);
  });

  it('aplica ferramentas de pincel corretamente no grid', () => {
    const grid = createBaseGrid(5, 5);
    const engine = new SimulationEngine(grid);

    // Pincel de plantar árvore
    engine.applyBrush({ col: 1, row: 1 }, 'plant_tree');
    expect(engine.grid[1][1].state).toBe(CellState.ARVORE_ADULTA);

    // Pincel de desmatar
    engine.applyBrush({ col: 1, row: 1 }, 'deforest');
    expect(engine.grid[1][1].state).toBe(CellState.SOLO_SECO);

    // Pincel de abrir canal de água
    engine.applyBrush({ col: 3, row: 3 }, 'water_channel');
    expect(engine.grid[3][3].state).toBe(CellState.LEITO_AGUA);

    // Pincel de secar canal de água
    engine.applyBrush({ col: 3, row: 3 }, 'dry_channel');
    expect(engine.grid[3][3].state).toBe(CellState.LEITO_SECO);

    // Pincel de colocar solo seco inerte
    engine.applyBrush({ col: 1, row: 1 }, 'dry_soil');
    expect(engine.grid[1][1].state).toBe(CellState.SOLO_SECO);

    engine.applyBrush({ col: 3, row: 3 }, 'dry_soil');
    expect(engine.grid[3][3].state).toBe(CellState.SOLO_SECO);
  });

  it('permite escolher a quantidade de polinizadores dinamicamente', () => {
    const engine = new SimulationEngine(createBaseGrid(), { disperserCount: 10 });
    expect(engine.dispersers.length).toBe(10);
    expect(engine.getMetrics().disperserCount).toBe(10);

    // Aumenta quantidade para 15
    engine.setDisperserCount(15);
    expect(engine.dispersers.length).toBe(15);
    expect(engine.config.disperserCount).toBe(15);
    expect(engine.getMetrics().disperserCount).toBe(15);

    // Reduz quantidade para 3
    engine.setDisperserCount(3);
    expect(engine.dispersers.length).toBe(3);
    expect(engine.config.disperserCount).toBe(3);
    expect(engine.getMetrics().disperserCount).toBe(3);

    // Reduz quantidade para 0
    engine.setDisperserCount(0);
    expect(engine.dispersers.length).toBe(0);
    expect(engine.config.disperserCount).toBe(0);
    expect(engine.getMetrics().disperserCount).toBe(0);
  });

  it('cria mapa com apenas solo seco inerte através do Preset Solo Seco Inerte', () => {
    const dryGrid = createDrySoilPreset();
    for (let r = 0; r < dryGrid.length; r++) {
      for (let c = 0; c < dryGrid[0].length; c++) {
        expect(dryGrid[r][c].state).toBe(CellState.SOLO_SECO);
      }
    }

    const engine = new SimulationEngine(dryGrid);
    const metrics = engine.getMetrics();
    expect(metrics.totalRiverCells).toBe(0);
    expect(metrics.activeRiverCells).toBe(0);
    expect(metrics.adultTreeCount).toBe(0);
    expect(metrics.sproutCount).toBe(0);
    expect(metrics.seedCount).toBe(0);

    // Verifica presença no catálogo PRESETS
    expect(PRESETS.dry_soil).toBeDefined();
    expect(PRESETS.dry_soil.name).toBe('Solo Seco Inerte');
    expect(PRESETS.dry_soil.badge).toBe('Árido');
  });
});

describe('Nuvens e Precipitação Pluvial', () => {
  it('identifica corretamente corpos d água densos com >= 4 canais em raio de 1 bloco', () => {
    const grid = createBaseGrid(5, 5);
    // Cria 4 células de água em raio de 1 bloco ao redor de (2, 2)
    grid[2][2].state = CellState.LEITO_AGUA;
    grid[2][1].state = CellState.LEITO_AGUA;
    grid[1][2].state = CellState.LEITO_AGUA;
    grid[3][2].state = CellState.LEITO_AGUA;

    expect(countNearbyWaterCells(grid, { col: 2, row: 2 })).toBe(4);
    expect(countNearbyWaterCells(grid, { col: 0, row: 0 })).toBe(0);
  });

  it('permite que nuvens existam exclusivamente na estação CHUVOSA e dissipem na SECA', () => {
    const engine = new SimulationEngine(createBaseGrid(), { disperserCount: 0 });
    engine.season = ClimateSeason.CHUVOSA;
    engine.clouds.push(createCloud(1, 100, 100));
    expect(engine.clouds.length).toBe(1);

    // Na estação SECA, nuvens devem ser dissipadas
    engine.season = ClimateSeason.SECA;
    engine.updateCloudsTick();
    expect(engine.clouds.length).toBe(0);
  });

  it('transforma solo inerte em solo fértil ao passar nuvem por cima', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { disperserCount: 0 });
    engine.season = ClimateSeason.CHUVOSA;

    // Coloca nuvem exatamente sobre a célula (5, 5) que é SOLO_SECO
    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    // Executa múltiplos ticks de chuva para validar a transição estatística (70% de chance)
    let converted = false;
    for (let i = 0; i < 15; i++) {
      cloud.life = 50; // Mantém nuvem viva
      engine.updateCloudsTick();
      if (engine.grid[5][5].state === CellState.SOLO_FERTIL) {
        converted = true;
        break;
      }
    }

    expect(converted).toBe(true);
    expect(engine.grid[5][5].state).toBe(CellState.SOLO_FERTIL);
    expect(engine.grid[5][5].cloudMoisture).toBeGreaterThan(0);
  });

  it('retarda o secamento de canais de água desprotegidos na estação SECA devido à umidade das nuvens', () => {
    const grid = createBaseGrid(5, 5);
    grid[2][2].state = CellState.LEITO_AGUA;
    // Canal desprotegido (0 árvores ao redor)
    expect(countNeighboringAdultTrees(grid, { col: 2, row: 2 })).toBe(0);

    const engine = new SimulationEngine(grid, {
      evaporationProbabilityDry: 1.0, // 100% chance de evaporar sem proteção
      waterRadius: 1,
    });
    engine.season = ClimateSeason.SECA;

    // Adiciona reserva de umidade deixada por chuva de nuvens
    engine.grid[2][2].cloudMoisture = 5;

    // Executa 1 tick na seca
    engine.step();

    // Devido à umidade da nuvem, o canal NÃO evapora no tick, retardando a seca!
    expect(engine.grid[2][2].state).toBe(CellState.LEITO_AGUA);
    expect(engine.grid[2][2].cloudMoisture).toBe(4);
  });

  it('atualiza movimentação e limites das nuvens de forma suave', () => {
    const engine = new SimulationEngine(createBaseGrid());
    engine.season = ClimateSeason.CHUVOSA;
    const cloud = createCloud(1, 100, 100, 1.0, 0.5);
    engine.clouds.push(cloud);

    const prevX = cloud.x;
    const prevY = cloud.y;

    engine.updateCloudsMotion();

    expect(cloud.x).not.toBe(prevX);
    expect(cloud.y).not.toBe(prevY);
  });

  it('germina semente em broto ao passar nuvem por cima (20% de chance, 1 tentativa por encontro)', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { cloudSeedGerminationProbability: 1.0 }); // 100% para garantir germinação na 1ª tentativa
    engine.season = ClimateSeason.CHUVOSA;

    // Coloca semente na célula (5, 5)
    const targetCell = engine.grid[5][5];
    targetCell.state = CellState.SEMENTE;
    targetCell.age = 0;

    // Posiciona nuvem sobre a célula (5, 5)
    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    // Com 100% de chance, deve germinar na primeira tentativa (1 tick)
    cloud.life = 100;
    engine.updateCloudsTick();

    expect(engine.grid[5][5].state).toBe(CellState.BROTO);
    expect(engine.seedsGerminated).toBeGreaterThanOrEqual(1);
  });

  it('não rola germinação múltiplas vezes enquanto a nuvem paira sobre a mesma semente', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { cloudSeedGerminationProbability: 0.0 }); // 0% → nunca germina
    engine.season = ClimateSeason.CHUVOSA;

    const targetCell = engine.grid[5][5];
    targetCell.state = CellState.SEMENTE;
    targetCell.age = 0;

    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    // Executa 50 ticks com a nuvem parada sobre a semente (nunca sai do raio)
    for (let i = 0; i < 50; i++) {
      cloud.life = 100;
      engine.updateCloudsTick();
    }

    // Com probabilidade 0%, jamais deve ter germinado — mas o flag deve ter sido setado na 1ª tentativa
    expect(engine.grid[5][5].state).toBe(CellState.SEMENTE);
    expect(engine.grid[5][5].hasReceivedCloud).toBe(true);
    expect(engine.seedsGerminated).toBe(0);
  });

  it('reseta hasReceivedCloud quando a semente sai da cobertura da nuvem', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { cloudSeedGerminationProbability: 0.0 }); // 0% → nunca germina
    engine.season = ClimateSeason.CHUVOSA;

    const targetCell = engine.grid[5][5];
    targetCell.state = CellState.SEMENTE;
    targetCell.age = 0;

    // Nuvem sobre a semente: seta hasReceivedCloud = true
    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    cloud.life = 100;
    engine.updateCloudsTick();
    expect(engine.grid[5][5].hasReceivedCloud).toBe(true);

    // Move a nuvem para longe da semente
    cloud.x = 9999;
    cloud.y = 9999;

    cloud.life = 100;
    engine.updateCloudsTick();

    // Semente saiu da cobertura → flag deve ser resetado
    expect(engine.grid[5][5].hasReceivedCloud).toBe(false);
  });

  it('permite nova tentativa de germinação quando uma nova nuvem passa após a primeira ter saído', () => {
    const grid = createBaseGrid(10, 10);
    // Primeira nuvem com 0% → não germina e seta flag
    const engine = new SimulationEngine(grid, { cloudSeedGerminationProbability: 0.0 });
    engine.season = ClimateSeason.CHUVOSA;

    const targetCell = engine.grid[5][5];
    targetCell.state = CellState.SEMENTE;
    targetCell.age = 0;

    const cloud1 = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud1.radius = 25;
    engine.clouds.push(cloud1);

    cloud1.life = 100;
    engine.updateCloudsTick();
    expect(engine.grid[5][5].hasReceivedCloud).toBe(true);

    // Remove a primeira nuvem e adiciona nova nuvem com 100% de germinação
    engine.clouds = [];
    engine.config.cloudSeedGerminationProbability = 1.0;

    // Tick sem nuvem → reseta flag
    engine.updateCloudsTick();
    expect(engine.grid[5][5].hasReceivedCloud).toBe(false);

    // Nova nuvem com 100%: deve germinar agora
    const cloud2 = createCloud(2, 5 * 20 + 10, 5 * 20 + 10);
    cloud2.radius = 25;
    engine.clouds.push(cloud2);

    cloud2.life = 100;
    engine.updateCloudsTick();
    expect(engine.grid[5][5].state).toBe(CellState.BROTO);
  });
  it('NÃO germina via cloudMoisture quando dado de nuvem falha — regressão do bug de germinação garantida', () => {
    // Antes do fix: cloudMoisture = 25 era setado mesmo quando o dado falhava.
    // O step() interpretava cloudMoisture > 0 como hasWater = true, germinando
    // a semente garantidamente após seedToSproutTicks (10) ticks — ignorando
    // completamente o dado de cloudSeedGerminationProbability.
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, {
      cloudSeedGerminationProbability: 0.0, // 0% → dado sempre falha
      seedToSproutTicks: 10,
      waterRadius: 0, // sem rio próximo
      disperserCount: 0,
    });
    engine.season = ClimateSeason.CHUVOSA;

    engine.grid[5][5].state = CellState.SEMENTE;
    engine.grid[5][5].age = 0;

    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    // Executa 20 ticks completos (step inclui updateCloudsTick) com nuvem parada.
    // Antes do fix: germinaria no tick 10 via cloudMoisture → hasWater → age >= 10.
    // Após o fix: sem cloudMoisture, hasWater = false → semente decai normalmente
    // após seedDecayCycles (15) ticks → SOLO_SECO. Nunca vira BROTO.
    for (let i = 0; i < 20; i++) {
      cloud.life = 100;
      engine.step();
    }

    // O importante: semente NÃO virou BROTO (germinação pelo backdoor do cloudMoisture)
    // Ela decaiu para SOLO_SECO por falta de água real (seedDecayCycles = 15 ticks)
    expect(engine.grid[5][5].state).not.toBe(CellState.BROTO);
    expect(engine.seedsGerminated).toBe(0);
  });

  it('renova cloudMoisture de um BROTO quando a nuvem passa por cima', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { waterRadius: 0, disperserCount: 0 });
    engine.season = ClimateSeason.CHUVOSA;

    engine.grid[5][5].state = CellState.BROTO;
    engine.grid[5][5].age = 2;
    engine.grid[5][5].cloudMoisture = 1; // Quase sem água

    const cloud = createCloud(1, 5 * 20 + 10, 5 * 20 + 10);
    cloud.radius = 25;
    engine.clouds.push(cloud);

    engine.updateCloudsTick();

    // A nuvem regou o broto, renovando o cloudMoisture para 25
    expect(engine.grid[5][5].cloudMoisture).toBe(25);
    expect(engine.grid[5][5].state).toBe(CellState.BROTO);
  });

  it('permite que um BROTO longe do rio amadureça até ARVORE_ADULTA sustentado pela chuva da nuvem', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, {
      waterRadius: 0, // Sem rio por perto
      sproutToTreeTicks: 16,
      disperserCount: 0,
    });
    engine.season = ClimateSeason.CHUVOSA;

    // Broto longe do rio recém-irrigado pela nuvem
    engine.grid[5][5].state = CellState.BROTO;
    engine.grid[5][5].age = 0;
    engine.grid[5][5].cloudMoisture = 25; // 25 ticks de umidade > 16 ticks necessários

    // Avança 16 ticks
    for (let i = 0; i < 16; i++) {
      engine.step();
    }

    // Graças à umidade da chuva, o broto sobreviveu e amadureceu em árvore adulta!
    expect(engine.grid[5][5].state).toBe(CellState.ARVORE_ADULTA);
  });
});

describe('Regras de Fertilidade e Persistência de Estado', () => {
  it('mantém SOLO_FERTIL por exatamente 20 ciclos sem água antes de dessecar para SOLO_SECO', () => {
    const grid = createBaseGrid(5, 5);
    // Sem água no grid
    const engine = new SimulationEngine(grid, { waterRadius: 1 });

    // Transforma célula (2, 2) em SOLO_FERTIL (como uma nuvem faria) com age 0
    engine.grid[2][2].state = CellState.SOLO_FERTIL;
    engine.grid[2][2].age = 0;

    // Ciclos 1 a 19: permanece fértil incrementando a idade
    for (let c = 1; c <= 19; c++) {
      engine.step();
      expect(engine.grid[2][2].state).toBe(CellState.SOLO_FERTIL);
      expect(engine.grid[2][2].age).toBe(c);
    }

    // Ciclo 20 (após 20 ciclos férteis completos sem água, desseca)
    engine.step();
    expect(engine.grid[2][2].state).toBe(CellState.SOLO_SECO);
    expect(engine.grid[2][2].age).toBe(0);
  });

  it('reseta a contagem de dessecação se o solo receber hidratação contínua', () => {
    const grid = createBaseGrid(5, 5);
    grid[2][1].state = CellState.LEITO_AGUA; // Água vizinha
    const engine = new SimulationEngine(grid, { waterRadius: 1 });

    engine.grid[2][2].state = CellState.SOLO_FERTIL;
    engine.grid[2][2].age = 3;

    // Com água vizinha no raio 1, o solo está hidratado
    engine.step();
    expect(engine.grid[2][2].state).toBe(CellState.SOLO_FERTIL);
    expect(engine.grid[2][2].age).toBe(0);
  });

  it('ajustes de waterRadius, disperserCount e velocidade não resetam a grade de simulação', () => {
    const grid = createBaseGrid(10, 10);
    const engine = new SimulationEngine(grid, { waterRadius: 1 });

    // Altera manualmente uma célula para testar persistência
    engine.grid[3][3].state = CellState.ARVORE_ADULTA;
    engine.grid[4][4].state = CellState.SEMENTE;

    // Altera waterRadius
    engine.setWaterRadius(3);
    expect(engine.grid[3][3].state).toBe(CellState.ARVORE_ADULTA);
    expect(engine.grid[4][4].state).toBe(CellState.SEMENTE);

    // Altera disperserCount
    engine.setDisperserCount(12);
    expect(engine.dispersers.length).toBe(12);
    expect(engine.grid[3][3].state).toBe(CellState.ARVORE_ADULTA);
    expect(engine.grid[4][4].state).toBe(CellState.SEMENTE);

    // Altera speed
    engine.setSpeed(5);
    expect(engine.config.framesPerTick).toBe(5);
    expect(engine.grid[3][3].state).toBe(CellState.ARVORE_ADULTA);
    expect(engine.grid[4][4].state).toBe(CellState.SEMENTE);
  });
});
