import { buildCellGrid } from './grid';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Floyd-Steinberg error diffusion.
 *
 * Ordered dithering (Bayer) hides quantization error using a fixed
 * pattern; error diffusion instead hides it by pushing the rounding error
 * from each cell onto its not-yet-processed neighbors, so the *average*
 * brightness over a region stays accurate even though every individual
 * cell is pure black or white. Visiting cells in the same order every time
 * (left-to-right, top-to-bottom) and using no randomness keeps the result
 * fully deterministic.
 *
 * Classic Floyd-Steinberg kernel (current cell is X, weights /16):
 *        X   7
 *    3   5   1
 */
export const floydSteinbergAlgorithm: RasterAlgorithm = {
  id: 'floydSteinberg',
  label: 'Floyd-Steinberg',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const gridData = buildCellGrid(imageData, settings.grid.cellSize);
    const { cols, rows, cellSize, luminance, avgColor } = gridData;
    const cells: RasterCell[] = [];
    // 128 splits the tonal range evenly between "quantizes to black" and
    // "quantizes to white" -- the same fixed cutoff every error-diffusion
    // algorithm here uses, since the diffused error (not a moving cutoff)
    // is what does the tonal work.
    const cutoff = 128;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const old = luminance[idx];
        const active = old < cutoff;
        const quantized = active ? 0 : 255;
        const error = old - quantized;

        // Push the rounding error onto neighbors that haven't been
        // quantized yet. Edge cells simply drop the share that would have
        // landed outside the grid.
        if (col + 1 < cols) luminance[idx + 1] += error * (7 / 16);
        if (row + 1 < rows) {
          const belowRow = (row + 1) * cols;
          if (col - 1 >= 0) luminance[belowRow + col - 1] += error * (3 / 16);
          luminance[belowRow + col] += error * (5 / 16);
          if (col + 1 < cols) luminance[belowRow + col + 1] += error * (1 / 16);
        }

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
