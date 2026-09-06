import type { RasterLabState } from './types';

// The "visually satisfying starting preset" described in the spec:
// grayscale sampling, white background, near-black foreground,
// medium-fine circular halftone, no noise, no animation.
export const defaultState: RasterLabState = {
  imageProcessing: {
    grayscale: true,
    brightness: 0,
    contrast: 10,
    gamma: 1,
    blur: 0,
    invert: false,
  },
  algorithm: 'halftone',
  threshold: {
    threshold: 128,
  },
  halftone: {
    minMarkSize: 0,
    maxMarkSize: 0.95,
    invert: false,
  },
  renderer: 'circle',
  palette: {
    foreground: '#111111',
    background: '#ffffff',
  },
  grid: {
    cellSize: 10,
  },
};
