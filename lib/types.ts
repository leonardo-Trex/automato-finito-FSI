/**
 * Plantae Evolution — Tipos do Modelo de Bacia Hidrográfica e Mata Ciliar
 *
 * Define os estados celulares, sazonalidade climática, interfaces dos agentes
 * dispersores e contratos de configuração da simulação.
 *
 * Referência: TASK.md § 2 (Modelo Conceitual e Arquitetura de Dados)
 */

/**
 * Estados discretos de cada célula do autômato celular.
 */
export enum CellState {
  SOLO_SECO = 0,       // Solo inerte fora do raio hídrico
  SOLO_FERTIL = 1,     // Margem dentro do raio de influência do rio
  SEMENTE = 2,         // Semente depositada pelo dispersor
  BROTO = 3,           // Vegetação jovem em fixação
  ARVORE_ADULTA = 4,   // Mata ciliar consolidada (fornece proteção térmica/sombra)
  LEITO_AGUA = 5,      // Célula de rio ativa (emite raio de umidade)
  LEITO_SECO = 6,      // Célula de rio evaporada/assoreada
}

/**
 * Ciclo global de estações climáticas.
 */
export enum ClimateSeason {
  CHUVOSA = 'CHUVOSA',
  SECA = 'SECA',
}

/**
 * Representação de uma célula na matriz celular.
 */
export interface Cell {
  state: CellState;
  /** Ciclos decorridos no estado atual (usado para germinação, maturação ou degradação) */
  age: number;
  /** Reserva de umidade fornecida por chuva de nuvens (retarda evaporação e secamento) */
  cloudMoisture?: number;
}

/** Matriz bidimensional de células */
export type Grid = Cell[][];

/** Coordenada de uma célula na grade */
export interface GridCoord {
  col: number;
  row: number;
}

/**
 * Agente móvel polinizador / dispersor de sementes.
 */
export interface Disperser {
  id: number;
  /** Posição horizontal contínua em pixels */
  x: number;
  /** Posição vertical contínua em pixels */
  y: number;
  /** Velocidade horizontal em pixels por frame */
  vx: number;
  /** Velocidade vertical em pixels por frame */
  vy: number;
  /** Se o agente está atualmente carregando uma semente colhida */
  hasSeed: boolean;
  /** Ticks desde a última coleta de semente */
  seedCooldown: number;
}

/**
 * Agente atmosférico: Nuvem de chuva.
 * Surge na estação chuvosa por condensação sobre corpos d'água densos (>= 4 canais em raio 1)
 * ou pelas bordas da simulação (5% de chance).
 */
export interface Cloud {
  id: number;
  /** Posição horizontal contínua em pixels */
  x: number;
  /** Posição vertical contínua em pixels */
  y: number;
  /** Velocidade horizontal em pixels por frame */
  vx: number;
  /** Velocidade vertical em pixels por frame */
  vy: number;
  /** Raio da nuvem em pixels */
  radius: number;
  /** Duração restante da nuvem em ticks */
  life: number;
  /** Opacidade visual da nuvem */
  opacity: number;
}

/**
 * Contrato de parâmetros e taxas da simulação.
 */
export interface SimConfig {
  /** Raio de influência da água para fertilização do solo (distância Chebyshev) */
  waterRadius: number;
  /** Duração em ticks de cada estação climática */
  seasonDurationTicks: number;
  /** Chance por tick de uma célula de LEITO_AGUA desprotegida evaporar durante a SECA (0.0 a 1.0) */
  evaporationProbabilityDry: number;
  /** Mínimo de árvores adultas vizinhas (vizinhança de Moore) para proteger o leito da evaporação */
  treesNeededForProtection: number;
  /** Chance por tick de LEITO_SECO adjacente a LEITO_AGUA recuperar água durante CHUVOSA */
  recoveryProbabilityRain: number;
  /** Ciclos que uma semente sobrevive em solo seco antes de degradar */
  seedDecayCycles: number;
  /** Ticks para uma semente germinar e virar broto em solo fértil */
  seedToSproutTicks: number;
  /** Ticks para um broto amadurecer e virar árvore adulta com água contínua */
  sproutToTreeTicks: number;
  /** Taxa basal mínima de senescência natural de árvores adultas por tick */
  treeMortalityRate: number;
  /** Quantidade de agentes dispersores simultâneos */
  disperserCount: number;
  /** Chance de um agente com semente depositá-la ao sobrevoar o solo */
  disperserDropProbability: number;
  /** Cadência padrão de frames por tick lógico */
  framesPerTick: number;
}

/**
 * Métricas ecológicas planetárias calculadas em tempo real.
 */
export interface SimulationMetrics {
  totalRiverCells: number;
  activeRiverCells: number;
  dryRiverCells: number;
  /** Porcentagem do leito do rio atualmente com água ativa */
  riverPreservationPct: number;
  adultTreeCount: number;
  sproutCount: number;
  seedCount: number;
  /** Porcentagem de células do rio com proteção adequada de mata ciliar (>= 3 árvores) */
  riparianDensityPct: number;
  totalSeedsDropped: number;
  seedsGerminated: number;
  seedsLost: number;
  /** Taxa de germinação efetiva: germinadas / (germinadas + perdidas) */
  effectiveGerminationRate: number;
  currentSeason: ClimateSeason;
  /** Progresso da estação atual (0 a 100%) */
  seasonProgress: number;
  totalTicks: number;
  /** Quantidade atual de agentes dispersores ativos */
  disperserCount?: number;
  /** Quantidade atual de nuvens ativas na simulação */
  cloudCount?: number;
}

/**
 * Ferramentas de pincel para interação manual do usuário com o grid.
 */
export type BrushTool =
  | 'plant_tree'      // Plantar árvore adulta
  | 'plant_seed'      // Plantar semente
  | 'deforest'        // Desmatar (remover vegetação)
  | 'water_channel'   // Criar leito de água
  | 'dry_channel'     // Secar canal de água
  | 'dry_soil'        // Colocar solo seco inerte
  | 'inspect';        // Apenas inspecionar célula
