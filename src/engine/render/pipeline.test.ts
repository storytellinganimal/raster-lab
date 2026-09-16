import { describe, expect, it } from 'vitest';
import { runPipeline } from './pipeline';
import { algorithms } from '../algorithms';
import { defaultState } from '../../state/defaults';
import { createFakeCanvas } from '../../test/fakeCanvas';
import { makeStripedImageData } from '../../test/testImage';
import type { AlgorithmId, RasterLabState } from '../../state/types';

const EXISTING_ALGORITHM_IDS: AlgorithmId[] = [
  'threshold',
  'halftone',
  'bayer2',
  'bayer4',
  'bayer8',
  'floydSteinberg',
  'atkinson',
  'posterize',
];

const testImage = makeStripedImageData(200, 60, [20, 90, 150, 230]);

// Neutral (identity) preprocessing -- these tests compare a direct
// algorithm.generate() call against what runPipeline() produces, and
// runPipeline() always preprocesses the image first (default contrast:10
// would otherwise shift per-cell averages for cells whose grid straddles
// a stripe boundary, via preprocess.ts's 0..255 clamping, making the two
// call paths not directly comparable through no fault of the app).
function settingsFor(algorithm: AlgorithmId): RasterLabState {
  return {
    ...defaultState,
    algorithm,
    grid: { cellSize: 20 },
    imageProcessing: { ...defaultState.imageProcessing, contrast: 0 },
  };
}

// F. Existing algorithms still produce the same results as before.
//
// Phase 3's only change to the shared pipeline is: (1) RasterCell gained
// an optional `rendererId` field, and (2) pipeline.ts now uses it when
// present, falling back to the single globally-selected renderer when it
// isn't. No existing algorithm module was touched, and none of them ever
// sets `rendererId` -- so the correct, checkable guarantee is that this
// stays true (an existing algorithm accidentally setting it would silently
// change its rendering path) and that the pipeline still routes every one
// of their cells through the single global renderer, exactly as before
// Hybrid Raster existed.
describe('existing algorithms are unaffected by the Hybrid rendererId extension', () => {
  it.each(EXISTING_ALGORITHM_IDS)('%s never sets RasterCell.rendererId', (id) => {
    const settings = settingsFor(id);
    const cells = algorithms[id].generate({ imageData: testImage, settings });
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.rendererId).toBeUndefined();
    }
  });

  it.each(EXISTING_ALGORITHM_IDS)('%s: every draw call still goes through the single selected renderer', (id) => {
    const settings = { ...settingsFor(id), renderer: 'square' as const };
    const { canvas, calls } = createFakeCanvas();
    runPipeline(testImage, canvas, settings);

    const markCalls = calls.slice(1); // drop the initial background fillRect
    expect(markCalls.length).toBeGreaterThan(0);
    // "square" only ever issues fillRect calls -- if any active cell had
    // been routed to a different renderer we'd see an 'arc' call here.
    expect(markCalls.every((c) => c.kind === 'fillRect')).toBe(true);
  });
});

// G. Hybrid Raster's rendering path (the one export/PNG output goes
// through) completes and routes each cell to the renderer its tonal
// region specifies. Actual pixel/PNG-byte correctness is verified in the
// browser (Phase 3 acceptance test) -- a Node fake canvas can't rasterize,
// only record which draw calls were made.
describe('Hybrid Raster render/export path', () => {
  it('G. runs to completion and draws one mark per active cell, using each region\'s own renderer', () => {
    const settings = settingsFor('hybrid');
    const { canvas, calls } = createFakeCanvas();

    expect(() => runPipeline(testImage, canvas, settings)).not.toThrow();

    const cells = algorithms.hybrid.generate({ imageData: testImage, settings });
    const expectedActive = cells.filter((c) => c.active);
    const markCalls = calls.slice(1); // drop the initial background fillRect

    expect(markCalls.length).toBe(expectedActive.length);

    // The default preset uses pixel (shadows), square (dark midtones) and
    // circle (light midtones) -- i.e. both fillRect- and arc-based
    // renderers appear in one single Hybrid render.
    const kindsUsed = new Set(markCalls.map((c) => c.kind));
    expect(kindsUsed.has('fillRect')).toBe(true);
    expect(kindsUsed.has('arc')).toBe(true);
  });

  it('C. "None" regions (highlights, by default) contribute zero draw calls', () => {
    const settings = settingsFor('hybrid');
    const { canvas, calls } = createFakeCanvas();
    runPipeline(testImage, canvas, settings);

    const cells = algorithms.hybrid.generate({ imageData: testImage, settings });
    const highlightCount = cells.filter((c) => c.luminance >= settings.hybrid.boundaries.lightMidtonesMax).length;
    expect(highlightCount).toBeGreaterThan(0);

    const markCallCount = calls.length - 1; // drop the background fill
    const activeCount = cells.filter((c) => c.active).length;
    // Every drawn mark corresponds to an active cell; None-region cells
    // are simply absent from that count.
    expect(markCallCount).toBe(activeCount);
    expect(activeCount).toBe(cells.length - highlightCount);
  });
});
