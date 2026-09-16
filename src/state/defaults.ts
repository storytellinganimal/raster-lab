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
  posterize: {
    levels: 4,
  },
  // Quartile boundaries plus a legible negative-space -> fine raster ->
  // stronger geometric raster -> solid mass progression from highlights
  // down to shadows -- see engine/algorithms/hybrid.ts.
  hybrid: {
    boundaries: {
      shadowsMax: 64,
      darkMidtonesMax: 128,
      lightMidtonesMax: 192,
    },
    regions: {
      shadows: { markType: 'pixel', markSize: 1 },
      darkMidtones: { markType: 'square', markSize: 0.65 },
      lightMidtones: { markType: 'circle', markSize: 0.25 },
      highlights: { markType: 'none', markSize: 0 },
    },
  },
  renderer: 'circle',
  palette: {
    background: '#ffffff',
    colors: ['#111111'],
  },
  grid: {
    cellSize: 10,
  },
};
