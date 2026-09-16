/**
 * Builds an NxN Bayer (ordered-dithering) threshold matrix recursively.
 * The classic construction: given the matrix for size n, the matrix for
 * size 2n is four copies of it tiled 2x2, each copy offset by a different
 * multiple of 4 -- that offset is what makes the dither pattern at each
 * scale a refinement of the scale below it, rather than unrelated noise.
 *   M(2)  = [[0,2],
 *            [3,1]]
 *   M(2n)[y][x]     = 4*M(n)[y][x]
 *   M(2n)[y][x+n]   = 4*M(n)[y][x] + 2
 *   M(2n)[y+n][x]   = 4*M(n)[y][x] + 3
 *   M(2n)[y+n][x+n] = 4*M(n)[y][x] + 1
 *
 * Shared by the Bayer raster algorithm (picks a mark on/off per cell) and
 * the palette color mapper (picks which of two neighboring palette colors
 * a cell gets) -- both are "compare a value against a spatially-varying,
 * repeating threshold" problems, just applied to different values.
 */
export function buildBayerMatrix(n: number): number[][] {
  if (n === 2) return [[0, 2], [3, 1]];
  const half = buildBayerMatrix(n / 2);
  const h = n / 2;
  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < h; x++) {
      const v = half[y][x];
      m[y][x] = 4 * v;
      m[y][x + h] = 4 * v + 2;
      m[y + h][x] = 4 * v + 3;
      m[y + h][x + h] = 4 * v + 1;
    }
  }
  return m;
}

/** Same matrix, normalized so every cell is a threshold in 0..1. */
export function bayerThreshold01(n: number): number[][] {
  return buildBayerMatrix(n).map((row) => row.map((v) => (v + 0.5) / (n * n)));
}
