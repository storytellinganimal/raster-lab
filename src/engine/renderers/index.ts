import type { RendererId } from '../../state/types';
import type { Renderer } from './types';
import { circleRenderer } from './circle';
import { squareRenderer } from './square';
import { pixelRenderer } from './pixel';

// Registry, mirroring engine/algorithms/index.ts -- adding a renderer means
// writing the module and adding one line here.
export const renderers: Record<RendererId, Renderer> = {
  circle: circleRenderer,
  square: squareRenderer,
  pixel: pixelRenderer,
};
