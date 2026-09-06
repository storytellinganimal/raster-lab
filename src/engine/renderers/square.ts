import type { Renderer } from './types';

export const squareRenderer: Renderer = {
  id: 'square',
  label: 'Square',
  draw({ ctx, cell, color }) {
    if (!cell.active) return;
    const side = cell.cellSize * cell.size;
    if (side <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(cell.x - side / 2, cell.y - side / 2, side, side);
  },
};
