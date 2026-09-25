/**
 * Plantae Evolution — Cenários Predefinidos da Simulação
 *
 * Cenários didáticos e ecológicos para demonstrar o papel protetor
 * da Mata Ciliar contra o dessecamento e a evaporação da bacia hidrográfica.
 *
 * Referência: TASK.md § Fase 4 (Botão de Preset de Cenários)
 */

import { CellState, Grid, ClimateSeason } from './types';
import { GRID_COLS, GRID_ROWS } from './constants';

export interface PresetScenario {
  id: string;
  name: string;
  badge: string;
  description: string;
  initialSeason: ClimateSeason;
  createGrid: () => Grid;
}

/**
 * Cria um grid preenchido com SOLO_SECO por padrão.
 */
export function createBaseGrid(cols: number = GRID_COLS, rows: number = GRID_ROWS): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      state: CellState.SOLO_SECO,
      age: 0,
    })),
  );
}

/**
 * Retorna as coordenadas de um rio meandrado natural que atravessa o grid de oeste a leste.
 */
export function getMeanderingRiverPath(cols: number = GRID_COLS, rows: number = GRID_ROWS): Array<{ col: number; row: number }> {
  const path: Array<{ col: number; row: number }> = [];
  const midRow = Math.floor(rows / 2);

  for (let c = 0; c < cols; c++) {
    // Curvatura senoidal natural para o rio
    const wave = Math.sin((c / cols) * Math.PI * 2.5);
    const r = Math.round(midRow + wave * 3.5);
    const boundedRow = Math.max(2, Math.min(rows - 3, r));
    path.push({ col: c, row: boundedRow });

    // Para rios mais volumosos, adiciona uma célula adjacente em curvas
    if (c > 3 && c < cols - 3 && (c % 4 === 0 || c % 5 === 0)) {
      path.push({ col: c, row: boundedRow + 1 });
    }
  }

  return path;
}

/**
 * Preset A — Mata Nativa Equilibrada:
 * Rio cercado por mata ciliar densa (árvores adultas em ambas as margens).
 * O rio resiste à transição da estação seca devido à proteção da copa.
 */
export function createBalancedForestPreset(): Grid {
  const grid = createBaseGrid();
  const riverCoords = getMeanderingRiverPath();

  // 1. Escavar o leito do rio
  for (const { col, row } of riverCoords) {
    grid[row][col] = { state: CellState.LEITO_AGUA, age: 0 };
  }

  // 2. Plantar mata ciliar densa (ARVORE_ADULTA) nas margens de Moore
  for (const { col, row } of riverCoords) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nr = row + dy;
        const nc = col + dx;
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
          if (grid[nr][nc].state === CellState.SOLO_SECO) {
            // Garante pelo menos 3-4 árvores ao redor de cada trecho de rio
            grid[nr][nc] = { state: CellState.ARVORE_ADULTA, age: 30 };
          }
        }
      }
    }
  }

  return grid;
}

/**
 * Preset B — Bacia Degradada / Desmatada:
 * Mesmo leito de rio, porém margens totalmente desprovidas de vegetação arbórea.
 * Durante a estiagem, sem proteção de sombra, o rio seca progressivamente.
 */
export function createDegradedBasinPreset(): Grid {
  const grid = createBaseGrid();
  const riverCoords = getMeanderingRiverPath();

  // Apenas o leito do rio ativo, sem qualquer árvore ciliar
  for (const { col, row } of riverCoords) {
    grid[row][col] = { state: CellState.LEITO_AGUA, age: 0 };
  }

  return grid;
}

/**
 * Preset C — Restauração Ecológica:
 * Bacia mista com trechos desmatados e trechos com remanescentes florestais,
 * com brotos e sementes em fixação nas margens úmidas.
 */
export function createRestorationPreset(): Grid {
  const grid = createBaseGrid();
  const riverCoords = getMeanderingRiverPath();

  for (const { col, row } of riverCoords) {
    grid[row][col] = { state: CellState.LEITO_AGUA, age: 0 };
  }

  // Mata nativa presente apenas na metade oeste (montante)
  for (const { col, row } of riverCoords) {
    if (col < Math.floor(GRID_COLS * 0.45)) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nr = row + dy;
          const nc = col + dx;
          if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
            if (grid[nr][nc].state === CellState.SOLO_SECO) {
              grid[nr][nc] = { state: CellState.ARVORE_ADULTA, age: 25 };
            }
          }
        }
      }
    } else if (col < Math.floor(GRID_COLS * 0.7)) {
      // Zona de transição com alguns brotos e sementes
      const nr = row + (col % 2 === 0 ? 1 : -1);
      if (nr >= 0 && nr < GRID_ROWS && grid[nr][col].state === CellState.SOLO_SECO) {
        grid[nr][col] = { state: CellState.BROTO, age: 5 };
      }
    }
  }

  return grid;
}

export const PRESETS: Record<string, PresetScenario> = {
  balanced: {
    id: 'balanced',
    name: 'Mata Nativa Equilibrada',
    badge: 'Equilibrado',
    description: 'Bacia protegida por densa mata ciliar. O rio suporta a seca sem evaporar.',
    initialSeason: ClimateSeason.CHUVOSA,
    createGrid: createBalancedForestPreset,
  },
  degraded: {
    id: 'degraded',
    name: 'Bacia Degradada',
    badge: 'Crítico',
    description: 'Margens desmatadas e desprotegidas. O rio desseca rapidamente na estiagem.',
    initialSeason: ClimateSeason.CHUVOSA,
    createGrid: createDegradedBasinPreset,
  },
  restoration: {
    id: 'restoration',
    name: 'Restauração Ecológica',
    badge: 'Recuperação',
    description: 'Remanescentes florestais e corredores em restauração por polinizadores.',
    initialSeason: ClimateSeason.CHUVOSA,
    createGrid: createRestorationPreset,
  },
};
