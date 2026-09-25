/**
 * Plantae Evolution — Motor de Simulação Ecológica (Engine)
 *
 * Implementa a dinâmica do autômato celular com:
 * 1. Double-buffering estrito para transição determinística.
 * 2. Difusão de umidade a partir do leito de água (distância Chebyshev).
 * 3. Máquina de estados celular (água, solo fértil/seco, sementes, brotos, mata ciliar).
 * 4. Proteção térmica do leito por copa arbórea na seca e regeneração na chuva.
 * 5. Agentes dispersores com atração por vegetação e semeadura autônoma.
 * 6. Relógio sazonal com estações CHUVOSA e SECA.
 * 7. Agregação em tempo real de métricas planetárias.
 *
 * Referência: TASK.md § 2, 3 e Fase 2
 */

import {
  CellState,
  ClimateSeason,
  Disperser,
  Grid,
  GridCoord,
  SimConfig,
  SimulationMetrics,
  BrushTool,
} from './types';
import {
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  DEFAULT_SIM_CONFIG,
} from './constants';
import {
  getMooreNeighbors,
  isCoordValid,
} from './utils';
import { createBalancedForestPreset } from './presets';

/**
 * Cria uma cópia profunda de um grid celular.
 */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * Cria a população inicial de agentes dispersores (polinizadores/vento).
 */
export function createDispersers(count: number, width: number = CANVAS_WIDTH, height: number = CANVAS_HEIGHT): Disperser[] {
  const dispersers: Disperser[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 1.2;
    dispersers.push({
      id: i + 1,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hasSeed: Math.random() > 0.6,
      seedCooldown: 0,
    });
  }
  return dispersers;
}

/**
 * Calcula o mapa bidimensional de umidade / fertilização hídrica.
 * Células a distância Chebyshev <= radius de qualquer LEITO_AGUA ativo recebem umidade.
 */
export function computeHydrationMap(
  grid: Grid,
  effectiveRadius: number,
  cols: number = grid[0]?.length ?? GRID_COLS,
  rows: number = grid.length ?? GRID_ROWS,
): boolean[][] {
  const hydrated: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );

  // 1. Coleta coordenadas de todos os leitos de água ativos
  const waterCoords: GridCoord[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r]?.[c]?.state === CellState.LEITO_AGUA) {
        waterCoords.push({ col: c, row: r });
      }
    }
  }

  // 2. Difunde umidade no raio Chebyshev
  for (const { col, row } of waterCoords) {
    const minR = Math.max(0, row - effectiveRadius);
    const maxR = Math.min(rows - 1, row + effectiveRadius);
    const minC = Math.max(0, col - effectiveRadius);
    const maxC = Math.min(cols - 1, col + effectiveRadius);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        hydrated[r][c] = true;
      }
    }
  }

  return hydrated;
}

/**
 * Conta quantas árvores adultas existem na vizinhança de Moore de uma célula.
 */
export function countNeighboringAdultTrees(grid: Grid, coord: GridCoord): number {
  const neighbors = getMooreNeighbors(coord, grid[0].length, grid.length);
  let count = 0;
  for (const n of neighbors) {
    if (grid[n.row][n.col].state === CellState.ARVORE_ADULTA) {
      count++;
    }
  }
  return count;
}

/**
 * Verifica se uma célula de leito seco possui algum vizinho com água ativa.
 */
export function hasActiveWaterNeighbor(grid: Grid, coord: GridCoord): boolean {
  const neighbors = getMooreNeighbors(coord, grid[0].length, grid.length);
  for (const n of neighbors) {
    if (grid[n.row][n.col].state === CellState.LEITO_AGUA) {
      return true;
    }
  }
  return false;
}

/**
 * Classe principal do Motor de Simulação Ecológica da Bacia Hidrográfica.
 */
export class SimulationEngine {
  public grid: Grid;
  private nextGrid: Grid;
  public config: SimConfig;
  public season: ClimateSeason;
  public seasonTickCounter: number;
  public totalTicks: number;
  public dispersers: Disperser[];
  public running: boolean;

  // Contadores cumulativos de métricas
  public totalSeedsDropped: number;
  public seedsGerminated: number;
  public seedsLost: number;

  constructor(initialGrid?: Grid, config?: Partial<SimConfig>) {
    this.config = { ...DEFAULT_SIM_CONFIG, ...config };
    this.grid = initialGrid ? cloneGrid(initialGrid) : createBalancedForestPreset();
    this.nextGrid = cloneGrid(this.grid);
    this.season = ClimateSeason.CHUVOSA;
    this.seasonTickCounter = 0;
    this.totalTicks = 0;
    this.running = true;
    this.dispersers = createDispersers(this.config.disperserCount);

    this.totalSeedsDropped = 0;
    this.seedsGerminated = 0;
    this.seedsLost = 0;

    // Atualiza fertilidade inicial com base na água existente
    this.synchronizeInitialSoil();
  }

  /**
   * Sincroniza o solo fértil inicial a partir do leito de água.
   */
  private synchronizeInitialSoil(): void {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;
    const isHydrated = computeHydrationMap(this.grid, this.config.waterRadius, cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.grid[r][c];
        if (cell.state === CellState.SOLO_SECO && isHydrated[r][c]) {
          cell.state = CellState.SOLO_FERTIL;
        }
      }
    }
  }

  /**
   * Carrega um grid pré-definido e reseta os contadores sazonais.
   */
  public loadGrid(newGrid: Grid, initialSeason: ClimateSeason = ClimateSeason.CHUVOSA): void {
    this.grid = cloneGrid(newGrid);
    this.nextGrid = cloneGrid(newGrid);
    this.season = initialSeason;
    this.seasonTickCounter = 0;
    this.synchronizeInitialSoil();
  }

  /**
   * Atualiza a cadência de frames por tick.
   */
  public setSpeed(framesPerTick: number): void {
    this.config.framesPerTick = framesPerTick;
  }

  /**
   * Atualiza o raio de alcance hídrico da água.
   */
  public setWaterRadius(waterRadius: number): void {
    this.config.waterRadius = waterRadius;
  }

  /**
   * Reseta a simulação mantendo a configuração atual.
   */
  public reset(): void {
    this.grid = createBalancedForestPreset();
    this.nextGrid = cloneGrid(this.grid);
    this.season = ClimateSeason.CHUVOSA;
    this.seasonTickCounter = 0;
    this.totalTicks = 0;
    this.dispersers = createDispersers(this.config.disperserCount);
    this.totalSeedsDropped = 0;
    this.seedsGerminated = 0;
    this.seedsLost = 0;
    this.synchronizeInitialSoil();
  }

  /**
   * Executa um único passo (tick lógico) do autômato celular.
   */
  public step(): void {
    this.totalTicks++;
    this.seasonTickCounter++;

    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;

    // 1. Transição periódica do ciclo sazonal
    if (this.seasonTickCounter >= this.config.seasonDurationTicks) {
      this.seasonTickCounter = 0;
      this.season =
        this.season === ClimateSeason.CHUVOSA
          ? ClimateSeason.SECA
          : ClimateSeason.CHUVOSA;
    }

    // 2. Raio hídrico efetivo (expande ligeiramente na estação chuvosa)
    const effectiveRadius =
      this.season === ClimateSeason.CHUVOSA
        ? this.config.waterRadius + 1
        : this.config.waterRadius;

    // 3. Campo de difusão de umidade a partir do leito de água ativo
    const isHydrated = computeHydrationMap(
      this.grid,
      effectiveRadius,
      cols,
      rows,
    );

    // 4. Double-Buffering: Computa o próximo estado de cada célula
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const current = this.grid[r][c];
        const next = this.nextGrid[r][c];
        const coord: GridCoord = { col: c, row: r };
        const hydrated = isHydrated[r][c];

        switch (current.state) {
          // --- LEITO DE ÁGUA ATIVO ---
          case CellState.LEITO_AGUA: {
            if (this.season === ClimateSeason.SECA) {
              const trees = countNeighboringAdultTrees(this.grid, coord);
              // Proteção térmica/sombra da mata ciliar
              if (trees >= this.config.treesNeededForProtection) {
                // Leito protegido por copa densa (evaporação = 0%)
                next.state = CellState.LEITO_AGUA;
                next.age = current.age + 1;
              } else {
                // Desprotegido: alta chance de evaporação e assoreamento
                if (Math.random() < this.config.evaporationProbabilityDry) {
                  next.state = CellState.LEITO_SECO;
                  next.age = 0;
                } else {
                  next.state = CellState.LEITO_AGUA;
                  next.age = current.age + 1;
                }
              }
            } else {
              // Estação chuvosa: água perene e cheia
              next.state = CellState.LEITO_AGUA;
              next.age = current.age + 1;
            }
            break;
          }

          // --- LEITO SECO / ASSOREADO ---
          case CellState.LEITO_SECO: {
            if (this.season === ClimateSeason.CHUVOSA) {
              // Na chuva, leito seco adjacente a água ativa pode se regenerar
              if (hasActiveWaterNeighbor(this.grid, coord)) {
                if (Math.random() < this.config.recoveryProbabilityRain) {
                  next.state = CellState.LEITO_AGUA;
                  next.age = 0;
                } else {
                  next.state = CellState.LEITO_SECO;
                  next.age = current.age + 1;
                }
              } else {
                next.state = CellState.LEITO_SECO;
                next.age = current.age + 1;
              }
            } else {
              next.state = CellState.LEITO_SECO;
              next.age = current.age + 1;
            }
            break;
          }

          // --- SOLO SECO INERTE ---
          case CellState.SOLO_SECO: {
            if (hydrated) {
              // Entra no raio de influência do rio
              next.state = CellState.SOLO_FERTIL;
              next.age = 0;
            } else {
              next.state = CellState.SOLO_SECO;
              next.age = current.age + 1;
            }
            break;
          }

          // --- SOLO FÉRTIL (MARGEM ÚMIDA) ---
          case CellState.SOLO_FERTIL: {
            if (!hydrated) {
              // Se o trecho de rio secar, o solo ao redor desidrata
              next.state = CellState.SOLO_SECO;
              next.age = 0;
            } else {
              next.state = CellState.SOLO_FERTIL;
              next.age = current.age + 1;
            }
            break;
          }

          // --- SEMENTE DEPOSITADA ---
          case CellState.SEMENTE: {
            if (hydrated) {
              // Semente em solo fértil sobrevive e germina após tempo necessário
              const newAge = current.age + 1;
              if (newAge >= this.config.seedToSproutTicks) {
                next.state = CellState.BROTO;
                next.age = 0;
                this.seedsGerminated++;
              } else {
                next.state = CellState.SEMENTE;
                next.age = newAge;
              }
            } else {
              // Semente em solo seco não vinga e degrada após K ciclos
              const newAge = current.age + 1;
              if (newAge >= this.config.seedDecayCycles) {
                next.state = CellState.SOLO_SECO;
                next.age = 0;
                this.seedsLost++;
              } else {
                next.state = CellState.SEMENTE;
                next.age = newAge;
              }
            }
            break;
          }

          // --- BROTO JOVEM ---
          case CellState.BROTO: {
            if (!hydrated) {
              // Se a água secar durante a fase de broto, ele morre
              next.state = CellState.SOLO_SECO;
              next.age = 0;
            } else {
              const newAge = current.age + 1;
              if (newAge >= this.config.sproutToTreeTicks) {
                // Consolidação em árvore adulta
                next.state = CellState.ARVORE_ADULTA;
                next.age = 0;
              } else {
                next.state = CellState.BROTO;
                next.age = newAge;
              }
            }
            break;
          }

          // --- ÁRVORE ADULTA (MATA CILIAR) ---
          case CellState.ARVORE_ADULTA: {
            // Senescência natural mínima por ciclo
            if (Math.random() < this.config.treeMortalityRate) {
              next.state = hydrated ? CellState.SOLO_FERTIL : CellState.SOLO_SECO;
              next.age = 0;
            } else {
              next.state = CellState.ARVORE_ADULTA;
              next.age = current.age + 1;
            }
            break;
          }
        }
      }
    }

    // 5. Swap de buffers: substitui grid atual pelo novo estado computado
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.grid[r][c].state = this.nextGrid[r][c].state;
        this.grid[r][c].age = this.nextGrid[r][c].age;
      }
    }

    // 6. Atualização dos agentes dispersores em ticks
    this.updateDispersersTick();
  }

  /**
   * Atualização contínua de movimento e semeadura dos dispersores.
   * Chamado a cada frame visual (~60 FPS) para fluidez de voo.
   */
  public updateDispersersMotion(): void {
    if (!this.running) return;

    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;

    // Coleta centros de massa de árvores adultas para atração biótica
    const treeCoords: GridCoord[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c].state === CellState.ARVORE_ADULTA) {
          treeCoords.push({ col: c, row: r });
        }
      }
    }

    for (const d of this.dispersers) {
      // 1. Caminhada aleatória com viés suave
      d.vx += (Math.random() - 0.5) * 0.35;
      d.vy += (Math.random() - 0.5) * 0.35;

      // 2. Viés de atração para células com vegetação ativa
      if (treeCoords.length > 0 && Math.random() < 0.35) {
        // Encontra árvore mais próxima ou escolhe uma aleatória
        const targetTree = treeCoords[Math.floor(Math.random() * treeCoords.length)];
        const targetX = targetTree.col * CELL_SIZE + CELL_SIZE / 2;
        const targetY = targetTree.row * CELL_SIZE + CELL_SIZE / 2;

        const dx = targetX - d.x;
        const dy = targetY - d.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist > 15) {
          const steerStrength = 0.08;
          d.vx += (dx / dist) * steerStrength;
          d.vy += (dy / dist) * steerStrength;
        }
      }

      // 3. Limite de velocidade (max 2.2 px/frame)
      const currentSpeed = Math.hypot(d.vx, d.vy) || 1;
      const maxSpeed = 2.2;
      if (currentSpeed > maxSpeed) {
        d.vx = (d.vx / currentSpeed) * maxSpeed;
        d.vy = (d.vy / currentSpeed) * maxSpeed;
      }

      // 4. Integração de posição
      d.x += d.vx;
      d.y += d.vy;

      // 5. Wrap-around suave nas bordas do canvas
      const margin = 10;
      if (d.x < -margin) d.x = CANVAS_WIDTH + margin;
      if (d.x > CANVAS_WIDTH + margin) d.x = -margin;
      if (d.y < -margin) d.y = CANVAS_HEIGHT + margin;
      if (d.y > CANVAS_HEIGHT + margin) d.y = -margin;

      // 6. Coleta de semente ao visitar uma árvore adulta
      const col = Math.floor(d.x / CELL_SIZE);
      const row = Math.floor(d.y / CELL_SIZE);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        if (!d.hasSeed && d.seedCooldown === 0) {
          if (this.grid[row][col].state === CellState.ARVORE_ADULTA) {
            d.hasSeed = true;
          }
        }
      }

      if (d.seedCooldown > 0) {
        d.seedCooldown--;
      }
    }
  }

  /**
   * Processamento de drop de semente pelos dispersores (executado a cada tick lógico).
   */
  private updateDispersersTick(): void {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;

    for (const d of this.dispersers) {
      if (d.hasSeed) {
        if (Math.random() < this.config.disperserDropProbability) {
          const col = Math.floor(d.x / CELL_SIZE);
          const row = Math.floor(d.y / CELL_SIZE);

          if (col >= 0 && col < cols && row >= 0 && row < rows) {
            const cell = this.grid[row][col];
            // Deposita em qualquer solo desocupado (seco ou fértil)
            if (cell.state === CellState.SOLO_SECO || cell.state === CellState.SOLO_FERTIL) {
              cell.state = CellState.SEMENTE;
              cell.age = 0;
              d.hasSeed = false;
              d.seedCooldown = 25; // Intervalo para nova coleta
              this.totalSeedsDropped++;
            }
          }
        }
      }
    }
  }

  /**
   * Aplica uma ferramenta de pincel interativo disparada pelo clique ou arrasto do usuário.
   */
  public applyBrush(coord: GridCoord, tool: BrushTool): void {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;
    if (!isCoordValid(coord, cols, rows)) return;

    const cell = this.grid[coord.row][coord.col];

    switch (tool) {
      case 'plant_tree':
        cell.state = CellState.ARVORE_ADULTA;
        cell.age = 30;
        break;

      case 'plant_seed':
        cell.state = CellState.SEMENTE;
        cell.age = 0;
        break;

      case 'deforest':
        // Remove vegetação arbórea/broto/semente
        if (
          cell.state === CellState.ARVORE_ADULTA ||
          cell.state === CellState.BROTO ||
          cell.state === CellState.SEMENTE
        ) {
          // Determina se o solo fica fértil ou seco com base na água ao redor
          const isHydrated = computeHydrationMap(this.grid, this.config.waterRadius, cols, rows);
          cell.state = isHydrated[coord.row][coord.col]
            ? CellState.SOLO_FERTIL
            : CellState.SOLO_SECO;
          cell.age = 0;
        }
        break;

      case 'water_channel':
        cell.state = CellState.LEITO_AGUA;
        cell.age = 0;
        break;

      case 'dry_channel':
        if (cell.state === CellState.LEITO_AGUA) {
          cell.state = CellState.LEITO_SECO;
          cell.age = 0;
        }
        break;

      case 'inspect':
      default:
        break;
    }
  }

  /**
   * Agrega e calcula todas as métricas ecológicas em tempo real.
   */
  public getMetrics(): SimulationMetrics {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;

    let activeRiverCells = 0;
    let dryRiverCells = 0;
    let adultTreeCount = 0;
    let sproutCount = 0;
    let seedCount = 0;
    let protectedRiverCells = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.grid[r][c];
        switch (cell.state) {
          case CellState.LEITO_AGUA: {
            activeRiverCells++;
            const trees = countNeighboringAdultTrees(this.grid, { col: c, row: r });
            if (trees >= this.config.treesNeededForProtection) {
              protectedRiverCells++;
            }
            break;
          }
          case CellState.LEITO_SECO: {
            dryRiverCells++;
            const trees = countNeighboringAdultTrees(this.grid, { col: c, row: r });
            if (trees >= this.config.treesNeededForProtection) {
              protectedRiverCells++;
            }
            break;
          }
          case CellState.ARVORE_ADULTA:
            adultTreeCount++;
            break;
          case CellState.BROTO:
            sproutCount++;
            break;
          case CellState.SEMENTE:
            seedCount++;
            break;
        }
      }
    }

    const totalRiverCells = activeRiverCells + dryRiverCells;
    const riverPreservationPct =
      totalRiverCells > 0 ? Math.round((activeRiverCells / totalRiverCells) * 100) : 100;

    const riparianDensityPct =
      totalRiverCells > 0 ? Math.round((protectedRiverCells / totalRiverCells) * 100) : 0;

    const resolvedSeeds = this.seedsGerminated + this.seedsLost;
    const effectiveGerminationRate =
      resolvedSeeds > 0 ? Math.round((this.seedsGerminated / resolvedSeeds) * 100) : 0;

    const seasonProgress = Math.min(
      100,
      Math.round((this.seasonTickCounter / this.config.seasonDurationTicks) * 100),
    );

    return {
      totalRiverCells,
      activeRiverCells,
      dryRiverCells,
      riverPreservationPct,
      adultTreeCount,
      sproutCount,
      seedCount,
      riparianDensityPct,
      totalSeedsDropped: this.totalSeedsDropped,
      seedsGerminated: this.seedsGerminated,
      seedsLost: this.seedsLost,
      effectiveGerminationRate,
      currentSeason: this.season,
      seasonProgress,
      totalTicks: this.totalTicks,
    };
  }
}
