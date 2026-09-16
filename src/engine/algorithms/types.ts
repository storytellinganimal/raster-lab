import type { RasterLabState, RendererId } from '../../state/types';

/**
 * A RasterCell is the conceptual unit the algorithm layer hands to the
 * renderer layer: "at this grid position, with this luminance, draw a mark
 * of this size". Not every algorithm needs every field (dithering
 * algorithms mostly ignore `size` and just toggle `active`), but keeping
 * one shape means renderers don't need to know which algorithm produced
 * the cell.
 */
export interface RasterCell {
  x: number; // cell center, in source-image pixel space
  y: number;
  cellSize: number; // width/height of the grid cell this mark occupies
  luminance: number; // 0..255 average luminance sampled for this cell
  avgColor: string; // "#rrggbb" average color sampled for this cell, from
  // the preprocessed image -- used instead of the flat foreground color
  // when the Grayscale preprocessing toggle is off (see pipeline.ts).
  size: number; // 0..1, fraction of cellSize the mark should occupy
  active: boolean; // whether a mark should be drawn at all
  /**
   * Overrides which renderer draws this specific cell, instead of the
   * single globally-selected one in settings.renderer. Every existing
   * algorithm leaves this undefined -- one algorithm, one renderer, exactly
   * as before. Hybrid Raster is the only algorithm that sets it, because
   * different cells in the same hybrid render legitimately need different
   * mark shapes (see engine/algorithms/hybrid.ts and pipeline.ts).
   */
  rendererId?: RendererId;
}

/** Everything an algorithm needs to turn a preprocessed image into cells. */
export interface AlgorithmContext {
  imageData: ImageData;
  settings: RasterLabState;
}

export interface RasterAlgorithm {
  id: string;
  label: string;
  generate(ctx: AlgorithmContext): RasterCell[];
}
