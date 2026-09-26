/**
 * Plantae Evolution — Constantes e Configurações Padrão
 *
 * Centraliza dimensões do grid, paleta de cores canônica definida no TASK.md
 * e os parâmetros padrão da simulação de bacia hidrográfica e mata ciliar.
 *
 * Referência: TASK.md § Fase 3 (Paleta de Cores) e § 4 (Roteiro Técnico)
 */

import { CellState, SimConfig } from './types';

// ---------------------------------------------------------------------------
// Dimensões do Canvas e Grid
// ---------------------------------------------------------------------------
export const CELL_SIZE = 20;
export const GRID_COLS = 32;
export const GRID_ROWS = 24;
export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE; // 640px
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE; // 480px

// ---------------------------------------------------------------------------
// Paleta Canônica (TASK.md § Fase 3)
// ---------------------------------------------------------------------------
export const CELL_COLORS: Record<CellState, string> = {
  [CellState.LEITO_AGUA]: '#1D4ED8',      // Azul vivo
  [CellState.LEITO_SECO]: '#94A3B8',      // Cinza leito árido
  [CellState.SOLO_FERTIL]: '#78350F',     // Marrom úmido
  [CellState.SOLO_SECO]: '#FDE68A',       // Areia / Árido
  [CellState.SEMENTE]: '#D97706',         // Ponto ocre
  [CellState.BROTO]: '#86EFAC',           // Verde broto
  [CellState.ARVORE_ADULTA]: '#15803D',   // Verde escuro de dossel
};

export const AGENT_COLOR = '#FACC15';      // Ponto amarelo brilhante / polinizador
export const AGENT_SEED_COLOR = '#F59E0B'; // Dourado com semente

// Cores de UI e Interface
export const UI_COLORS = {
  background: '#0B130E',
  surfacePanel: '#132219',
  surfaceCard: '#1C3225',
  surfaceHover: '#244030',
  borderSubtle: '#284B37',
  borderActive: '#4ADE80',
  textPrimary: '#F2FBF5',
  textMuted: '#94A89C',
  rainAccent: '#38BDF8',
  dryAccent: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
};

// ---------------------------------------------------------------------------
// Configuração Padrão da Simulação
// ---------------------------------------------------------------------------
export const DEFAULT_SIM_CONFIG: SimConfig = {
  waterRadius: 2,                     // Raio Chebyshev hídrico padrão (2 células)
  seasonDurationTicks: 90,            // Ticks por estação (~15-20s em velocidade normal)
  evaporationProbabilityDry: 0.12,    // 12% chance por tick de secar se árvores < 3 na seca
  treesNeededForProtection: 3,        // >= 3 árvores adultas protegem o leito
  recoveryProbabilityRain: 0.20,      // 20% chance de leito seco adjacente recuperar água na chuva
  seedDecayCycles: 15,                // Semente morre após 15 ticks em solo seco
  seedToSproutTicks: 10,              // 10 ticks em solo fértil para brotar
  sproutToTreeTicks: 16,              // 16 ticks com água contínua para virar árvore adulta
  treeMortalityRate: 0.001,           // Senescência natural mínima (0.1% por tick)
  disperserCount: 10,                 // 10 agentes polinizadores
  disperserDropProbability: 0.06,     // 6% de chance por tick de soltar semente em solo
  framesPerTick: 12,                  // ~5 ticks/seg a 60 FPS
  fertileSoilRetentionCycles: 20,     // Solos férteis duram 20 ciclos sem água contínua antes de dessecar
  cloudSeedGerminationProbability: 0.05, // 5% de chance de semente germinar ao passar nuvem
};
