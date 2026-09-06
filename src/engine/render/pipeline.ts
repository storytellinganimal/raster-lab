import type { RasterLabState } from '../../state/types';
import { preprocess } from '../image/preprocess';
import { algorithms } from '../algorithms';
import { renderers } from '../renderers';

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

  for (const cell of cells) {
    renderer.draw({ ctx, cell, color: settings.palette.foreground });
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
