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
