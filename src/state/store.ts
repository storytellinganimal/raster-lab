import { create } from 'zustand';
import type {
  AlgorithmId,
  GridSettings,
  HalftoneSettings,
  ImageProcessingSettings,
  Palette,
  PosterizeSettings,
  RasterLabState,
  RendererId,
  ThresholdSettings,
  TonalRegionConfig,
  TonalRegionId,
} from './types';
import { defaultState } from './defaults';
import { blendHex } from '../engine/utils/color';

// Ascending order -- used to find each boundary's neighbors when clamping
// an edit, so shadowsMax < darkMidtonesMax < lightMidtonesMax can never be
// violated no matter which one is dragged or by how much.
const BOUNDARY_KEYS = ['shadowsMax', 'darkMidtonesMax', 'lightMidtonesMax'] as const;
type BoundaryKey = (typeof BOUNDARY_KEYS)[number];

interface StoreActions {
  setImageProcessing: (patch: Partial<ImageProcessingSettings>) => void;
  setAlgorithm: (id: AlgorithmId) => void;
  setThreshold: (patch: Partial<ThresholdSettings>) => void;
  setHalftone: (patch: Partial<HalftoneSettings>) => void;
  setPosterize: (patch: Partial<PosterizeSettings>) => void;
  /** Moves one boundary, clamped so it stays strictly between its
   * neighbors (a 1-unit gap minimum) -- boundaries can never cross or
   * collapse a region to zero width, regardless of the raw value passed
   * in. */
  setHybridBoundary: (key: BoundaryKey, value: number) => void;
  setHybridRegion: (id: TonalRegionId, patch: Partial<TonalRegionConfig>) => void;
  setRenderer: (id: RendererId) => void;
  setPalette: (patch: Partial<Palette>) => void;
  setGrid: (patch: Partial<GridSettings>) => void;
  swapPalette: () => void;
  /** Appends one color to the mark palette, defaulted to roughly halfway
   * between the current lightest and darkest entries so it's immediately
   * useful before the user picks their own hex. */
  addPaletteColor: () => void;
  /** Removes one mark color by index. A no-op if only one remains -- the
   * palette can never go empty. */
  removePaletteColor: (index: number) => void;
  setPaletteColor: (index: number, hex: string) => void;
  reset: () => void;
  loadState: (state: RasterLabState) => void;
}

export type Store = RasterLabState & StoreActions;

export const useStore = create<Store>((set) => ({
  ...defaultState,
  setImageProcessing: (patch) =>
    set((s) => ({ imageProcessing: { ...s.imageProcessing, ...patch } })),
  setAlgorithm: (id) => set({ algorithm: id }),
  setThreshold: (patch) => set((s) => ({ threshold: { ...s.threshold, ...patch } })),
  setHalftone: (patch) => set((s) => ({ halftone: { ...s.halftone, ...patch } })),
  setPosterize: (patch) => set((s) => ({ posterize: { ...s.posterize, ...patch } })),
  setHybridBoundary: (key, value) =>
    set((s) => {
      const boundaries = { ...s.hybrid.boundaries };
      const i = BOUNDARY_KEYS.indexOf(key);
      const prevKey = BOUNDARY_KEYS[i - 1];
      const nextKey = BOUNDARY_KEYS[i + 1];
      const min = prevKey ? boundaries[prevKey] + 1 : 1;
      const max = nextKey ? boundaries[nextKey] - 1 : 254;
      boundaries[key] = Math.min(max, Math.max(min, Math.round(value)));
      return { hybrid: { ...s.hybrid, boundaries } };
    }),
  setHybridRegion: (id, patch) =>
    set((s) => ({
      hybrid: { ...s.hybrid, regions: { ...s.hybrid.regions, [id]: { ...s.hybrid.regions[id], ...patch } } },
    })),
  setRenderer: (id) => set({ renderer: id }),
  setPalette: (patch) => set((s) => ({ palette: { ...s.palette, ...patch } })),
  setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
  swapPalette: () =>
    set((s) => {
      const { colors, background } = s.palette;
      if (colors.length <= 1) {
        // Classic two-color swap: the one mark color and the background
        // trade places, exactly like the old single-foreground behavior.
        return { palette: { background: colors[0] ?? background, colors: [background] } };
      }
      // No single "foreground" to swap once there's a real palette --
      // reversing the lightest-to-darkest order is the natural analog,
      // and inverts which end of the tonal range each color lands on.
      return { palette: { ...s.palette, colors: [...colors].reverse() } };
    }),
  addPaletteColor: () =>
    set((s) => {
      const { colors, background } = s.palette;
      const next =
        colors.length >= 2
          ? blendHex(colors[0], colors[colors.length - 1], 0.5)
          : blendHex(colors[0] ?? '#000000', background, 0.5);
      return { palette: { ...s.palette, colors: [...colors, next] } };
    }),
  removePaletteColor: (index) =>
    set((s) => {
      if (s.palette.colors.length <= 1) return {};
      return { palette: { ...s.palette, colors: s.palette.colors.filter((_, i) => i !== index) } };
    }),
  setPaletteColor: (index, hex) =>
    set((s) => ({
      palette: { ...s.palette, colors: s.palette.colors.map((c, i) => (i === index ? hex : c)) },
    })),
  reset: () => set({ ...defaultState }),
  loadState: (state) => set({ ...state }),
}));
