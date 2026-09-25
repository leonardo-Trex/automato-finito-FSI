import { describe, it, expect } from 'vitest';
import {
  SimulationEngine,
  computeHydrationMap,
  countNeighboringAdultTrees,
  hasActiveWaterNeighbor,
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
