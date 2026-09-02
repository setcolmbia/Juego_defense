export const COLS = 8;
export const ROWS = 5;
export const TILE = 2.1;

/** World-space X center of a lane column (0 = closest to base). */
export function colToX(col: number): number {
  return col * TILE;
}

/** World-space Z center of a lane row. */
export function rowToZ(row: number): number {
  return (row - (ROWS - 1) / 2) * TILE;
}

export function worldToCol(x: number): number {
  return Math.round(x / TILE);
}

export function worldToRow(z: number): number {
  return Math.round(z / TILE + (ROWS - 1) / 2);
}

export const BASE_X = -TILE * 1.3;
export const SPAWN_X = colToX(COLS - 1) + TILE * 2.4;
