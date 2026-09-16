// Core type definitions for Raster Lab.
// These interfaces are the contract between the four independent systems:
// Image Processing -> Raster Algorithm -> Renderer -> Animation.
// Keeping them in one file makes it easy to see the whole data model at a glance.

/** Preprocessing applied to the source image before any raster algorithm runs. */
export interface ImageProcessingSettings {
  grayscale: boolean;
  brightness: number; // -100 .. 100
  contrast: number; // -100 .. 100
  gamma: number; // 0.1 .. 4, 1 = no change
  blur: number; // 0 .. 20 px (box blur radius)
  invert: boolean;
}

/** Which raster algorithm decides *where* marks appear. */
export type AlgorithmId =
  | 'threshold'
  | 'halftone'
  | 'bayer2'
  | 'bayer4'
  | 'bayer8'
  | 'floydSteinberg'
  | 'atkinson'
  | 'posterize'
  | 'hybrid';

export interface ThresholdSettings {
  threshold: number; // 0..255
}

export interface HalftoneSettings {
  minMarkSize: number; // 0..1, fraction of cell at lightest tone
  maxMarkSize: number; // 0..1, fraction of cell at darkest tone
  invert: boolean; // dark -> small instead of dark -> large
}

export interface PosterizeSettings {
  levels: number; // 2..8 discrete tonal bands
}

/** Which renderer decides *what* mark is drawn for an active cell. */
export type RendererId = 'circle' | 'square' | 'pixel';

/**
 * A tonal region's mark treatment, in the vocabulary Hybrid Raster's UI
 * exposes. 'none' has no renderer at all -- it means "this tonal region is
 * negative space" -- everything else maps directly onto a RendererId (see
 * engine/algorithms/hybrid.ts).
 */
export type MarkType = 'none' | 'circle' | 'square' | 'pixel';

export interface TonalRegionConfig {
  markType: MarkType;
  markSize: number; // 0..1, same normalized size semantics as every other algorithm
}

/**
 * Fixed set of tonal regions for Phase 3's Hybrid Raster. Named (not a
 * positional array) so that region identity can never be confused with
 * array order, and so a future per-region property (color, density, grid
 * scale, jitter, rotation, pattern, animation...) is just one more field
 * on TonalRegionConfig, applied uniformly to all four -- no restructuring.
 */
export type TonalRegionId = 'shadows' | 'darkMidtones' | 'lightMidtones' | 'highlights';

export interface HybridSettings {
  /**
   * Three ascending cutpoints (0..255) splitting the luminance range into
   * four tonal regions:
   *   shadows       : [0, shadowsMax)
   *   dark midtones : [shadowsMax, darkMidtonesMax)
   *   light midtones: [darkMidtonesMax, lightMidtonesMax)
   *   highlights    : [lightMidtonesMax, 255]
   * Always shadowsMax < darkMidtonesMax < lightMidtonesMax -- enforced by
   * the store's setHybridBoundary action, not just by convention, so a
   * dragged boundary can never invert or collapse a region.
   */
  boundaries: {
    shadowsMax: number;
    darkMidtonesMax: number;
    lightMidtonesMax: number;
  };
  regions: Record<TonalRegionId, TonalRegionConfig>;
}

export interface Palette {
  /** Solid canvas backdrop -- independent of the mark palette below. */
  background: string;
  /**
   * The mark palette. With one entry this is the classic flat single
   * foreground color. With more than one, cell tone is mapped across the
   * list from lightest to darkest (colors are sorted by their own
   * luminance wherever they're used, so the order they were added in
   * doesn't matter), and cells whose tone falls between two neighboring
   * palette colors are ordered-dithered between them -- a patterned color
   * blend rather than a smooth gradient, matching the rest of the app's
   * raster aesthetic. Always has at least one entry.
   */
  colors: string[];
}

export interface GridSettings {
  cellSize: number;
}

export interface RasterLabState {
  imageProcessing: ImageProcessingSettings;
  algorithm: AlgorithmId;
  threshold: ThresholdSettings;
  halftone: HalftoneSettings;
  posterize: PosterizeSettings;
  hybrid: HybridSettings;
  renderer: RendererId;
  palette: Palette;
  grid: GridSettings;
}
