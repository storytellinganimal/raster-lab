import { create } from 'zustand';
import type {
  AlgorithmId,
  GridSettings,
  HalftoneSettings,
  ImageProcessingSettings,
  Palette,
  RasterLabState,
  RendererId,
  ThresholdSettings,
} from './types';
import { defaultState } from './defaults';

interface StoreActions {
  setImageProcessing: (patch: Partial<ImageProcessingSettings>) => void;
  setAlgorithm: (id: AlgorithmId) => void;
  setThreshold: (patch: Partial<ThresholdSettings>) => void;
  setHalftone: (patch: Partial<HalftoneSettings>) => void;
  setRenderer: (id: RendererId) => void;
  setPalette: (patch: Partial<Palette>) => void;
  setGrid: (patch: Partial<GridSettings>) => void;
  swapPalette: () => void;
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
  setRenderer: (id) => set({ renderer: id }),
  setPalette: (patch) => set((s) => ({ palette: { ...s.palette, ...patch } })),
  setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
  swapPalette: () =>
    set((s) => ({
      palette: { foreground: s.palette.background, background: s.palette.foreground },
    })),
  reset: () => set({ ...defaultState }),
  loadState: (state) => set({ ...state }),
}));
