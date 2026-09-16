/**
 * A plain {width, height, data} object shaped exactly like ImageData.
 * Nothing in the algorithm/pipeline layer does `instanceof ImageData` --
 * they all just destructure width/height/data -- so tests never need a
 * real browser ImageData to exercise them, only for the internal copy
 * engine/image/preprocess.ts makes (see vitest.setup.ts).
 */
export function makeSolidImageData(width: number, height: number, gray: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }
  return { width, height, data } as ImageData;
}

/** A horizontal strip image: each `stripes[i]` gray value fills an equal
 * vertical band, left band = stripes[0]. Useful for tonal-region tests
 * that need several known luminance levels in one image. */
export function makeStripedImageData(width: number, height: number, stripes: number[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const stripeWidth = Math.ceil(width / stripes.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray = stripes[Math.min(stripes.length - 1, Math.floor(x / stripeWidth))];
      const i = (y * width + x) * 4;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = 255;
    }
  }
  return { width, height, data } as ImageData;
}
