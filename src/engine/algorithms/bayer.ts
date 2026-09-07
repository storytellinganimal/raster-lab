import { buildCellGrid } from './grid';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Builds an NxN Bayer (ordered-dithering) threshold matrix recursively.
 * The classic construction: given the matrix for size n, the matrix for
 * size 2n is four copies of it tiled 2x2, each copy offset by a different
 * multiple of 4 -- that offset is what makes the dither pattern at each
 * scale a refinement of the scale below it, rather than unrelated noise.
 *   M(2)  = [[0,2],
 *            [3,1]]
 *   M(2n)[y][x]     = 4*M(n)[y][x]
 *   M(2n)[y][x+n]   = 4*M(n)[y][x] + 2
 *   M(2n)[y+n][x]   = 4*M(n)[y][x] + 3
 *   M(2n)[y+n][x+n] = 4*M(n)[y][x] + 1
 */
function buildBayerMatrix(n: number): number[][] {
  if (n === 2) return [[0, 2], [3, 1]];
  const half = buildBayerMatrix(n / 2);
  const h = n / 2;
  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < h; x++) {
      const v = half[y][x];
      m[y][x] = 4 * v;
      m[y][x + h] = 4 * v + 2;
      m[y + h][x] = 4 * v + 3;
      m[y + h][x + h] = 4 * v + 1;
    }
  }
  return m;
}

/**
 * Ordered (Bayer) dithering: instead of one global cutoff (Threshold) or a
 * randomized/error-diffused cutoff (Floyd-Steinberg, Atkinson), every cell
 * is compared against a threshold that depends only on its position in a
 * small repeating NxN matrix. The result is the distinctive regular
 * crosshatch pattern of ordered dithering -- fully deterministic, and the
 * same every time for the same image and matrix size.
 */
function createBayerAlgorithm(id: string, label: string, n: number): RasterAlgorithm {
  const matrix = buildBayerMatrix(n);
  // Pre-normalize each matrix cell to a 0..255 threshold once, up front,
  // rather than recomputing it for every image cell.
  const thresholds: number[][] = matrix.map((row) => row.map((v) => ((v + 0.5) / (n * n)) * 255));

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
