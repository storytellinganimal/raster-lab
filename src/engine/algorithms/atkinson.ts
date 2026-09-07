import { buildCellGrid } from './grid';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Atkinson dithering (the original Apple Macintosh algorithm).
 *
 * A variant of Floyd-Steinberg error diffusion: instead of spreading the
 * *entire* rounding error to neighbors, only 6/8 of it is diffused (each
 * of six neighbors gets 1/8) and the remaining 2/8 is simply discarded.
 * Throwing away some error stops it from accumulating across large flat
 * areas, which is what gives Atkinson its characteristic higher-contrast,
 * slightly "blown out" look compared to Floyd-Steinberg. Deterministic for
 * the same reason FS is: fixed visiting order, no randomness.
 *
 * Kernel (current cell is X, weights /8):
 *        X   1   1
 *    1   1   1
 *        1
 */
export const atkinsonAlgorithm: RasterAlgorithm = {
  id: 'atkinson',
  label: 'Atkinson',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const gridData = buildCellGrid(imageData, settings.grid.cellSize);
    const { cols, rows, cellSize, luminance, avgColor } = gridData;
    const cells: RasterCell[] = [];
    const cutoff = 128;
    const share = 1 / 8;

    function diffuse(row: number, col: number, amount: number) {
      if (row < 0 || row >= rows || col < 0 || col >= cols) return;
      luminance[row * cols + col] += amount;
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const old = luminance[idx];
        const active = old < cutoff;
        const quantized = active ? 0 : 255;
        const error = (old - quantized) * share;

        diffuse(row, col + 1, error);
        diffuse(row, col + 2, error);
        diffuse(row + 1, col - 1, error);
        diffuse(row + 1, col, error);
        diffuse(row + 1, col + 1, error);
        diffuse(row + 2, col, error);

        cells.push({
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2,
          cellSize,
          luminance: old,
          avgColor: avgColor[idx],
          size: 1,
          active,
        });
      }
    }
    return cells;
  },
};
