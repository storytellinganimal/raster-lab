// Minimal test-only polyfill for the one browser API the engine layer
// touches that a plain Node environment doesn't provide: the ImageData
// constructor, used internally by engine/image/preprocess.ts to build its
// output buffer. This is intentionally tiny -- just enough shape for
// `new ImageData(bytes, w, h)` and `new ImageData(w, h)` to work -- not a
// general canvas/DOM shim. Real pixel data always comes from a plain
// {width, height, data} object in tests; this only needs to exist so app
// code that constructs `ImageData` internally doesn't throw.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height as number;
      }
    }
  }
  // @ts-expect-error -- intentionally minimal, not a spec-complete ImageData
  globalThis.ImageData = ImageDataPolyfill;
}
