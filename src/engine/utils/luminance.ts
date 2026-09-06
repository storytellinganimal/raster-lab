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
  let sum = 0;
  let count = 0;
  const xEnd = Math.min(x1, width);
  const yEnd = Math.min(y1, height);
  for (let y = Math.max(y0, 0); y < yEnd; y++) {
    for (let x = Math.max(x0, 0); x < xEnd; x++) {
      const i = (y * width + x) * 4;
      sum += luminance(data[i], data[i + 1], data[i + 2]);
      count++;
    }
  }
  return count === 0 ? 255 : sum / count;
}
