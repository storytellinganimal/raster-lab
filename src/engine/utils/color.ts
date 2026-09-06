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
