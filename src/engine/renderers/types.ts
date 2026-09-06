import type { RasterCell } from '../algorithms/types';

/** Everything a renderer needs to draw one mark for one cell. */
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  cell: RasterCell;
  color: string;
}

export interface Renderer {
  id: string;
  label: string;
  draw(rc: RenderContext): void;
}
