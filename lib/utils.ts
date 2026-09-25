/**
 * Plantae Evolution — Utilitários Matemáticos e de Grid
 *
 * Funções puras para cálculo de distâncias (Chebyshev, Manhattan),
 * validação de coordenadas, vizinhança e manipulação espacial.
 */

import { GridCoord } from './types';
import { GRID_COLS, GRID_ROWS, CELL_SIZE } from './constants';

/**
 * Distância Chebyshev (L_infinito) entre duas coordenadas.
 * max(|dx|, |dy|) — métrica ideal para raios quadrados de difusão de umidade.
 */
export function chebyshevDistance(c1: GridCoord, c2: GridCoord): number {
  return Math.max(Math.abs(c1.col - c2.col), Math.abs(c1.row - c2.row));
}

/**
 * Distância Manhattan (L1) entre duas coordenadas.
 * |dx| + |dy| — métrica em diamante.
 */
export function manhattanDistance(c1: GridCoord, c2: GridCoord): number {
  return Math.abs(c1.col - c2.col) + Math.abs(c1.row - c2.row);
}

/**
 * Verifica se a coordenada está dentro dos limites da grade.
 */
export function isCoordValid(
  coord: GridCoord,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS,
): boolean {
  return coord.row >= 0 && coord.row < rows && coord.col >= 0 && coord.col < cols;
}

/**
 * Mapeia coordenadas em pixels do mouse/toque no canvas para coordenada do grid.
 * Retorna null se fora dos limites.
 */
export function mouseToGridCoord(
  mouseX: number,
  mouseY: number,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS,
  cellSize: number = CELL_SIZE,
): GridCoord | null {
  const col = Math.floor(mouseX / cellSize);
  const row = Math.floor(mouseY / cellSize);
  if (col < 0 || col >= cols || row < 0 || row >= rows) {
    return null;
  }
  return { col, row };
}

/**
 * Retorna as coordenadas da vizinhança de Moore (até 8 vizinhos ortogonais e diagonais).
 */
export function getMooreNeighbors(
  coord: GridCoord,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS,
): GridCoord[] {
  const neighbors: GridCoord[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const c = { col: coord.col + dx, row: coord.row + dy };
      if (isCoordValid(c, cols, rows)) {
        neighbors.push(c);
      }
    }
  }
  return neighbors;
}

/**
 * Retorna as coordenadas da vizinhança de Von Neumann (4 vizinhos ortogonais).
 */
export function getVonNeumannNeighbors(
  coord: GridCoord,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS,
): GridCoord[] {
  const deltas = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];
  const neighbors: GridCoord[] = [];
  for (const { dx, dy } of deltas) {
    const c = { col: coord.col + dx, row: coord.row + dy };
    if (isCoordValid(c, cols, rows)) {
      neighbors.push(c);
    }
  }
  return neighbors;
}

/**
 * Converte HEX para tupla RGB [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

/**
 * Clamp numérico entre min e max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
