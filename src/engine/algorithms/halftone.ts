import { sampleCell } from '../utils/luminance';
import { clamp, rgbToHex } from '../utils/color';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Variable-dot halftone.
 *
 * The image is divided into a grid of square cells. For each cell we
 * sample the average luminance of the pixels underneath it, then map that
 * single number to a mark size: dark cells get large marks, light cells
 * get small (or empty) marks -- exactly like a printed halftone screen.
 * The actual shape of the mark (circle, square, ...) is decided later by
 * the renderer, not here.
 */
export const halftoneAlgorithm: RasterAlgorithm = {
  id: 'halftone',
  label: 'Variable Dot Halftone',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const { width, height, data } = imageData;
    const cellSize = Math.max(2, settings.grid.cellSize);
    const { minMarkSize, maxMarkSize, invert } = settings.halftone;
    const cells: RasterCell[] = [];

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const sample = sampleCell(data, width, height, x, y, x + cellSize, y + cellSize);
        // tone: 0 = white (no mark), 1 = black (full mark)
        let tone = 1 - sample.luminance / 255;
        if (invert) tone = 1 - tone;
        const size = clamp(minMarkSize + tone * (maxMarkSize - minMarkSize), 0, 1);
        cells.push({
          x: x + cellSize / 2,
          y: y + cellSize / 2,
          cellSize,
          luminance: sample.luminance,
          avgColor: rgbToHex(sample.r, sample.g, sample.b),
          size,
          active: size > 0.02,
        });
      }
    }
    return cells;
  },
};
