import { buildCellGrid } from './grid';
import { bayerThreshold01 } from '../utils/orderedDither';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Ordered (Bayer) dithering: instead of one global cutoff (Threshold) or a
 * randomized/error-diffused cutoff (Floyd-Steinberg, Atkinson), every cell
 * is compared against a threshold that depends only on its position in a
 * small repeating NxN matrix. The result is the distinctive regular
 * crosshatch pattern of ordered dithering -- fully deterministic, and the
 * same every time for the same image and matrix size.
 */
function createBayerAlgorithm(id: string, label: string, n: number): RasterAlgorithm {
  // Pre-normalize each matrix cell to a 0..255 threshold once, up front,
  // rather than recomputing it for every image cell.
  const thresholds: number[][] = bayerThreshold01(n).map((row) => row.map((v) => v * 255));

  return {
    id,
    label,
    generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
      const gridData = buildCellGrid(imageData, settings.grid.cellSize);
      const { cols, rows, cellSize, luminance, avgColor } = gridData;
      const cells: RasterCell[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const lum = luminance[idx];
          const cutoff = thresholds[row % n][col % n];
          const active = lum < cutoff;
          cells.push({
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
            cellSize,
            luminance: lum,
            avgColor: avgColor[idx],
            size: 1,
            active,
          });
        }
      }
      return cells;
    },
  };
}

export const bayer2Algorithm = createBayerAlgorithm('bayer2', 'Bayer 2×2', 2);
export const bayer4Algorithm = createBayerAlgorithm('bayer4', 'Bayer 4×4', 4);
export const bayer8Algorithm = createBayerAlgorithm('bayer8', 'Bayer 8×8', 8);
