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
} from './types';
import { defaultState } from './defaults';
import { blendHex } from '../engine/utils/color';

interface StoreActions {
  setImageProcessing: (patch: Partial<ImageProcessingSettings>) => void;
  setAlgorithm: (id: AlgorithmId) => void;
  setThreshold: (patch: Partial<ThresholdSettings>) => void;
  setHalftone: (patch: Partial<HalftoneSettings>) => void;
  setPosterize: (patch: Partial<PosterizeSettings>) => void;
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
