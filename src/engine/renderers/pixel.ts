import type { Renderer } from './types';

// "Pixel" always fills the entire cell regardless of mark size -- useful
// for threshold/dither algorithms where a cell is simply on or off.
export const pixelRenderer: Renderer = {
  id: 'pixel',
  label: 'Solid Pixel',
  draw({ ctx, cell, color }) {
    if (!cell.active) return;
    ctx.fillStyle = color;
    ctx.fillRect(cell.x - cell.cellSize / 2, cell.y - cell.cellSize / 2, cell.cellSize, cell.cellSize);
  },
};
