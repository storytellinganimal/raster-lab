import type { Renderer } from './types';

export const circleRenderer: Renderer = {
  id: 'circle',
  label: 'Circle',
  draw({ ctx, cell, color }) {
    if (!cell.active) return;
    const radius = (cell.cellSize * cell.size) / 2;
    if (radius <= 0) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
    ctx.fill();
  },
};
