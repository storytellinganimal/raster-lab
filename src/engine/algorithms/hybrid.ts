import { buildCellGrid } from './grid';
import type { AlgorithmContext, RasterAlgorithm, RasterCell } from './types';
import type { HybridSettings, MarkType, RendererId, TonalRegionId } from '../../state/types';

/** Display/UI order for the four regions, darkest to lightest -- matches
 * the "0 ---- 255" convention used by the rest of the tonal-mapping code
 * (halftone.ts, posterize.ts) so shadows sit at the low-luminance end. */
export const TONAL_REGION_ORDER: TonalRegionId[] = [
  'shadows',
  'darkMidtones',
  'lightMidtones',
  'highlights',
];

/**
 * Which of the four tonal regions a luminance value falls into, given the
 * three ascending boundaries. This is the entire "classification" half of
 * Hybrid Raster, and it never looks at (or needs to look at) which
 * renderer is selected -- see pipeline.ts and hybrid.test.ts, which checks
 * exactly that.
 */
export function classifyTone(luminance: number, boundaries: HybridSettings['boundaries']): TonalRegionId {
  if (luminance < boundaries.shadowsMax) return 'shadows';
  if (luminance < boundaries.darkMidtonesMax) return 'darkMidtones';
  if (luminance < boundaries.lightMidtonesMax) return 'lightMidtones';
  return 'highlights';
}

// The hybrid system's own "None / Circle / Square / Solid Pixel"
// vocabulary maps directly onto existing renderer ids. 'none' is the one
// mark type with no entry here -- it means the cell is simply inactive, not
// "use some renderer that draws nothing".
const MARK_TYPE_TO_RENDERER: Partial<Record<MarkType, RendererId>> = {
  circle: 'circle',
  square: 'square',
  pixel: 'pixel',
};

/**
 * Hybrid Raster.
 *
 * Every other algorithm commits its whole image to one renderer and one
 * size curve. Hybrid Raster instead samples and classifies each cell
 * exactly like the others do (buildCellGrid, then a per-cell decision) --
 * the only difference is that classification here means "which of four
 * configurable tonal regions is this cell's luminance in", and each
 * region carries its own mark type and size. That's still just data:
 * this module never touches a CanvasRenderingContext2D. It sets
 * `rendererId` on cells that need a mark and leaves `active: false` (so
 * nothing gets drawn) for cells in a "None" region -- routing the actual
 * drawing is pipeline.ts's job, same as for every other algorithm.
 */
export const hybridAlgorithm: RasterAlgorithm = {
  id: 'hybrid',
  label: 'Hybrid Raster',
  generate({ imageData, settings }: AlgorithmContext): RasterCell[] {
    const gridData = buildCellGrid(imageData, settings.grid.cellSize);
    const { cols, rows, cellSize, luminance, avgColor } = gridData;
    const { boundaries, regions } = settings.hybrid;
    const cells: RasterCell[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const lum = luminance[idx];
        const regionId = classifyTone(lum, boundaries);
        const region = regions[regionId];
        const rendererId = MARK_TYPE_TO_RENDERER[region.markType];

        cells.push({
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2,
          cellSize,
          luminance: lum,
          avgColor: avgColor[idx],
          size: rendererId ? region.markSize : 0,
          active: rendererId !== undefined,
          rendererId,
        });
      }
    }
    return cells;
  },
};
