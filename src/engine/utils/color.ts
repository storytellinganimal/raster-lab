import { luminance } from './luminance';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parse "#rrggbb" (or "#rgb") into 0-255 channels. */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format 0-255 channels (fractional values are fine) as "#rrggbb". */
export function rgbToHex(r: number, g: number, b: number): string {
  const ch = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/** How light or dark a hex color itself is -- used to sort a palette of
 * colors from lightest to darkest regardless of the order they were added. */
export function hexLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return luminance(r, g, b);
}

/** Linear-interpolate between two hex colors, t=0 -> a, t=1 -> b. Used to
 * pick a sensible default when a new palette color is added. */
export function blendHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}
