// Luminance is the single number every raster algorithm reasons about:
// "how bright is this pixel/cell, from 0 (black) to 255 (white)".
// We use the standard perceptual weighting (Rec. 601) rather than a flat
// average, because the human eye is far more sensitive to green than blue.
export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Average luminance of a rectangular cell of an ImageData buffer. */
export function cellAverageLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  return sampleCell(data, width, height, x0, y0, x1, y1).luminance;
}

export interface CellSample {
  luminance: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Average luminance *and* average RGB color of a rectangular cell, sampled
 * in a single pass. Algorithms use `luminance` to decide where and how
 * large a mark is; the renderer can optionally use `r`/`g`/`b` to paint
 * that mark in the image's own sampled color instead of a flat palette
 * color (see the "Grayscale" preprocessing toggle: turning it off feeds
 * un-desaturated color into this sample, and the pipeline switches marks
 * over to using it instead of the flat foreground swatch).
 */
export function sampleCell(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CellSample {
  let lumSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const xEnd = Math.min(x1, width);
  const yEnd = Math.min(y1, height);
  for (let y = Math.max(y0, 0); y < yEnd; y++) {
    for (let x = Math.max(x0, 0); x < xEnd; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      lumSum += luminance(r, g, b);
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }
  }
  if (count === 0) return { luminance: 255, r: 255, g: 255, b: 255 };
  return { luminance: lumSum / count, r: rSum / count, g: gSum / count, b: bSum / count };
}
