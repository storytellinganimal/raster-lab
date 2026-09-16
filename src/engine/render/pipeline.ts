import type { RasterLabState } from '../../state/types';
import { preprocess } from '../image/preprocess';
import { algorithms } from '../algorithms';
import { renderers } from '../renderers';
import { hexLuminance } from '../utils/color';
import { bayerThreshold01 } from '../utils/orderedDither';
import type { RasterCell } from '../algorithms/types';

// The dither pattern used to blend between two neighboring palette colors
// (see paletteColorForCell below). 4x4 is fine enough that the transition
// between colors doesn't read as a chunky checkerboard, coarse enough to
// stay a deliberate pattern rather than a smooth gradient.
const PALETTE_DITHER = bayerThreshold01(4);

/**
 * Picks the mark color for one cell out of an ordered lightest-to-darkest
 * palette. With a single color this always returns it (the classic flat
 * look). With more, the cell's tone is mapped to a position along the
 * list; a cell that lands between two colors doesn't get a flat
 * interpolated blend -- it's ordered-dithered between its two neighbors
 * (same technique as Bayer dithering, just choosing a color instead of
 * on/off), which is what produces a patterned, halftone-like transition
 * between palette colors instead of a smooth gradient.
 */
function paletteColorForCell(cell: RasterCell, sortedColors: string[]): string {
  if (sortedColors.length <= 1) return sortedColors[0] ?? '#000000';

  const tone = 1 - cell.luminance / 255; // 0 = lightest, 1 = darkest
  const pos = Math.min(1, Math.max(0, tone)) * (sortedColors.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.min(sortedColors.length - 1, lower + 1);
  if (lower === upper) return sortedColors[lower];

  const frac = pos - lower;
  const col = Math.round(cell.x / cell.cellSize - 0.5);
  const row = Math.round(cell.y / cell.cellSize - 0.5);
  const n = PALETTE_DITHER.length;
  const cutoff = PALETTE_DITHER[((row % n) + n) % n][((col % n) + n) % n];
  return frac > cutoff ? sortedColors[upper] : sortedColors[lower];
}

/**
 * The full pipeline, end to end:
 *   source image -> preprocess -> algorithm (produces cells) -> renderer (draws cells)
 *
 * This is the one place that knows about all four systems at once; every
 * other module only knows about its own layer. Swapping an algorithm or
 * renderer is just picking a different entry from the registries above.
 */
export function runPipeline(
  sourceImageData: ImageData,
  outputCanvas: HTMLCanvasElement,
  settings: RasterLabState,
): void {
  const processed = preprocess(sourceImageData, settings.imageProcessing);

  outputCanvas.width = processed.width;
  outputCanvas.height = processed.height;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return;

  // Crisp raster marks, not browser-smoothed blur -- important for pixel /
  // dither aesthetics later, and harmless here.
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = settings.palette.background;
  ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  const algorithm = algorithms[settings.algorithm];
  const renderer = renderers[settings.renderer];
  const cells = algorithm.generate({ imageData: processed, settings });

  // Grayscale on (the default): every mark's color comes from the mark
  // palette, mapped across its tonal range -- a flat single color when
  // there's only one (the classic one-color halftone/threshold look,
  // unchanged), or a multi-color dithered gradient when there's more.
  // Grayscale off: there's no reason to still collapse every mark down to
  // a palette color, so each mark is instead painted with its own sampled
  // average color, giving a genuine color raster instead of two flat
  // tones that never change no matter what preprocessing does.
  const useSourceColor = !settings.imageProcessing.grayscale;
  // Sorted once per render, not per cell -- and sorted by each color's own
  // luminance so "lightest to darkest" holds regardless of the order
  // colors were added in.
  const sortedColors = [...settings.palette.colors].sort((a, b) => hexLuminance(b) - hexLuminance(a));
  for (const cell of cells) {
    const color = useSourceColor ? cell.avgColor : paletteColorForCell(cell, sortedColors);
    renderer.draw({ ctx, cell, color });
  }
}

/** Get a fresh, unmodified copy of an image's pixel data via an offscreen canvas. */
export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D context');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * A cheap, downscaled copy of the source image, used only as an interim
 * preview while a control is actively being dragged. Preprocessing and
 * algorithm cost scale with pixel count, so running the same pipeline on
 * (say) a quarter-resolution copy is roughly four times cheaper -- enough
 * to keep sliders responsive on large images. `scale` tells the caller how
 * much smaller this copy is than the real source, so grid/cell sizing can
 * be scaled down to match before running the pipeline on it.
 */
export function imageToPreviewImageData(
  img: HTMLImageElement,
  maxDim: number,
): { imageData: ImageData; scale: number } {
  const fullW = img.naturalWidth;
  const fullH = img.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(fullW, fullH));
  const width = Math.max(1, Math.round(fullW * scale));
  const height = Math.max(1, Math.round(fullH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D context');
  // Smoothing on for the downscale itself -- this is a one-time cost per
  // image load, and a nicer-quality shrink makes the interim preview more
  // representative of the final result.
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, width, height);
  return { imageData: ctx.getImageData(0, 0, width, height), scale };
}
