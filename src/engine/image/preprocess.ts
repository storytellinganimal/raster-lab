import type { ImageProcessingSettings } from '../../state/types';
import { clamp } from '../utils/color';

/**
 * Apply non-destructive preprocessing to a copy of the source ImageData.
 * The source ImageData passed in is never mutated -- callers should always
 * hand us a fresh copy of the original pixels (see getSourceImageData in
 * render/pipeline.ts) so re-processing at different settings never
 * compounds rounding error from a previous pass.
 */
export function preprocess(
  source: ImageData,
  settings: ImageProcessingSettings,
): ImageData {
  const out = new ImageData(
    new Uint8ClampedArray(source.data),
    source.width,
    source.height,
  );
  const data = out.data;

  const { grayscale, brightness, contrast, gamma, invert } = settings;

  // Contrast factor using the classic (259*(c+255)) / (255*(259-c)) formula,
  // which maps a -100..100 UI slider to a gentle-to-strong contrast curve.
  const c = clamp(contrast, -100, 100) * 2.55; // scale to -255..255
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
  const brightnessOffset = clamp(brightness, -100, 100) * 2.55;
  const invGamma = 1 / clamp(gamma, 0.1, 4);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (grayscale) {
      // Perceptual grayscale (see luminance.ts) applied to all three
      // channels so downstream code can keep treating the image as RGB.
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = l;
    }

    // Brightness: simple additive offset.
    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;

    // Contrast: push values away from (or toward) mid-gray (128).
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Gamma: power curve on the 0..1 normalized channel. Gamma < 1
    // brightens midtones, gamma > 1 darkens them.
    r = 255 * Math.pow(clamp(r, 0, 255) / 255, invGamma);
    g = 255 * Math.pow(clamp(g, 0, 255) / 255, invGamma);
    b = 255 * Math.pow(clamp(b, 0, 255) / 255, invGamma);

    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }

  if (settings.blur > 0) {
    boxBlur(out, Math.round(settings.blur));
  }

  return out;
}

/** Simple separable box blur, used for the "blur" preprocessing control. */
function boxBlur(img: ImageData, radius: number): void {
  if (radius <= 0) return;
  const { width, height, data } = img;
  const tmp = new Uint8ClampedArray(data.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = x + dx;
        if (sx < 0 || sx >= width) continue;
        const i = (y * width + sx) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        a += data[i + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      tmp[o] = r / count;
      tmp[o + 1] = g / count;
      tmp[o + 2] = b / count;
      tmp[o + 3] = a / count;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = y + dy;
        if (sy < 0 || sy >= height) continue;
        const i = (sy * width + x) * 4;
        r += tmp[i];
        g += tmp[i + 1];
        b += tmp[i + 2];
        a += tmp[i + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      data[o] = r / count;
      data[o + 1] = g / count;
      data[o + 2] = b / count;
      data[o + 3] = a / count;
    }
  }
}
