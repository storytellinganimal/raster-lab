import { sampleCell } from '../utils/luminance';
import { rgbToHex } from '../utils/color';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';

/**
 * Simple binary threshold: each cell is either fully "on" or fully "off"
 * depending on whether its average luminance falls above or below a single
 * cutoff value. This is the simplest possible raster algorithm and a good
 * baseline to compare every other algorithm against.
 */
export const thresholdAlgorithm: RasterAlgorithm = {
  id: 'threshold',
  label: 'Threshold',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const { width, height, data } = imageData;
    const cellSize = Math.max(1, settings.grid.cellSize);
    const cutoff = settings.threshold.threshold;
    const cells: RasterCell[] = [];

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const sample = sampleCell(data, width, height, x, y, x + cellSize, y + cellSize);
        const active = sample.luminance < cutoff;
        cells.push({
          x: x + cellSize / 2,
          y: y + cellSize / 2,
          cellSize,
          luminance: sample.luminance,
          avgColor: rgbToHex(sample.r, sample.g, sample.b),
          size: 1,
          active,
        });
      }
    }
    return cells;
  },
};
