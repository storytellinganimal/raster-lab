import { sampleCell } from '../utils/luminance';
import { rgbToHex } from '../utils/color';

/**
 * A regular grid of samples taken from a preprocessed image, one sample
 * per raster cell. This is the shared starting point for every algorithm
 * that needs to reason about neighboring cells -- ordered dithering looks
 * up a threshold by (row, col); error diffusion pushes leftover
 * quantization error into the cells to the right and below. Threshold and
 * Halftone don't need neighbor lookups, so they keep their own simple
 * single-pass loops rather than going through this.
 */
export interface CellGrid {
  cols: number;
  rows: number;
  cellSize: number;
  /** Mutable copy of each cell's luminance (0..255). Error-diffusion
   * algorithms add diffused error into this array as they go. */
  luminance: Float64Array;
  /** Each cell's sampled average color, as "#rrggbb", captured once before
   * any dithering -- diffusing luminance error must never bleed into the
   * color-mode ("Grayscale" off) rendering. */
  avgColor: string[];
}

export function buildCellGrid(imageData: ImageData, cellSize: number): CellGrid {
  const { width, height, data } = imageData;
  const size = Math.max(1, cellSize);
  const cols = Math.max(1, Math.ceil(width / size));
  const rows = Math.max(1, Math.ceil(height / size));
  const luminance = new Float64Array(cols * rows);
  const avgColor = new Array<string>(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size;
      const y = row * size;
      const sample = sampleCell(data, width, height, x, y, x + size, y + size);
      const idx = row * cols + col;
      luminance[idx] = sample.luminance;
      avgColor[idx] = rgbToHex(sample.r, sample.g, sample.b);
    }
  }

  return { cols, rows, cellSize: size, luminance, avgColor };
}
