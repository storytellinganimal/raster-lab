/**
 * A minimal stand-in for an HTMLCanvasElement + its 2D context, just
 * enough of the surface runPipeline() and the renderers actually call
 * (fillRect, beginPath/arc/fill, fillStyle, width/height) for pipeline
 * tests to run in plain Node and record what got drawn. This is not a
 * real rasterizer -- it can't answer "what color is pixel (x,y)" -- so it
 * verifies *that the right renderer was invoked for the right cells*,
 * which is what the architecture separation actually needs guarding.
 * Real pixel-level / exported-PNG correctness is verified in the browser
 * (see the Phase 3 acceptance test), not here.
 */
export interface DrawCall {
  kind: 'fillRect' | 'arc';
  x: number;
  y: number;
  size: number; // width/height for fillRect, radius for arc
  fillStyle: string;
}

export function createFakeCanvas() {
  const calls: DrawCall[] = [];
  let fillStyle = '#000000';
  let width = 0;
  let height = 0;

  const ctx = {
    imageSmoothingEnabled: true,
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
    },
    fillRect(x: number, y: number, w: number, _h: number) {
      calls.push({ kind: 'fillRect', x, y, size: w, fillStyle });
    },
    beginPath() {},
    arc(x: number, y: number, radius: number) {
      calls.push({ kind: 'arc', x, y, size: radius, fillStyle });
    },
    fill() {},
  };

  const canvas = {
    get width() {
      return width;
    },
    set width(v: number) {
      width = v;
    },
    get height() {
      return height;
    },
    set height(v: number) {
      height = v;
    },
    getContext(type: string) {
      return type === '2d' ? ctx : null;
    },
  };

  return { canvas: canvas as unknown as HTMLCanvasElement, calls };
}
