import { buildCellGrid } from './grid';
import { clamp } from '../utils/color';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Posterized tonal bands.
 *
 * Instead of a continuous gradient of mark sizes (as Halftone produces),
 * the tonal range is first collapsed to a small, fixed number of discrete
 * bands -- e.g. with 4 levels, every cell snaps to one of only 4 possible
 * darkness values. Mark size still follows darkness (darker band = larger
 * mark, same convention as Halftone/Threshold), but because the input is
 * quantized first, the output reads as flat stepped bands of tone rather
 * than a smooth gradient -- the classic "posterized" look.
 */
export const posterizeAlgorithm: RasterAlgorithm = {
  id: 'posterize',
  label: 'Posterized Tonal Bands',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const gridData = buildCellGrid(imageData, settings.grid.cellSize);
    const { cols, rows, cellSize, luminance, avgColor } = gridData;
    const cells: RasterCell[] = [];

    const levels = Math.max(2, Math.round(settings.posterize.levels));
    const steps = levels - 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const lum = luminance[idx];
        // tone: 0 = white, 1 = black, quantized down to one of `levels`
        // evenly-spaced steps before it ever becomes a mark size.
        const tone = 1 - lum / 255;
        const band = Math.round(tone * steps) / steps;
        const size = clamp(band, 0, 1);

        cells.push({
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2,
          cellSize,
          luminance: lum,
          avgColor: avgColor[idx],
          size,
          active: size > 0.02,
        });
      }
    }
    return cells;
  },
};
