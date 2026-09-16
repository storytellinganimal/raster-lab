import { describe, expect, it } from 'vitest';
import { classifyTone, hybridAlgorithm } from './hybrid';
import { defaultState } from '../../state/defaults';
import { makeStripedImageData } from '../../test/testImage';
import type { RasterLabState } from '../../state/types';

const BOUNDARIES = { shadowsMax: 64, darkMidtonesMax: 128, lightMidtonesMax: 192 };

function baseSettings(overrides: Partial<RasterLabState> = {}): RasterLabState {
  return { ...defaultState, algorithm: 'hybrid', ...overrides };
}

// A. Correct tonal-region classification.
describe('classifyTone', () => {
  it('classifies a value in each region correctly, including exact boundary values', () => {
    expect(classifyTone(0, BOUNDARIES)).toBe('shadows');
    expect(classifyTone(63, BOUNDARIES)).toBe('shadows');
    expect(classifyTone(64, BOUNDARIES)).toBe('darkMidtones'); // boundary itself belongs to the region above it
    expect(classifyTone(127, BOUNDARIES)).toBe('darkMidtones');
    expect(classifyTone(128, BOUNDARIES)).toBe('lightMidtones');
    expect(classifyTone(191, BOUNDARIES)).toBe('lightMidtones');
    expect(classifyTone(192, BOUNDARIES)).toBe('highlights');
    expect(classifyTone(255, BOUNDARIES)).toBe('highlights');
  });
});

describe('hybridAlgorithm.generate', () => {
  // Five vertical stripes spanning shadows -> highlights, one per tonal
  // region plus a second shadows-range stripe, at a cell size that divides
  // the image evenly so every cell sits inside exactly one stripe.
  const STRIPE_GRAYS = [10, 100, 160, 220]; // shadows, darkMid, lightMid, highlights
  const imageData = makeStripedImageData(400, 40, STRIPE_GRAYS);

  it('C. a "None" region produces cells that are inactive, size 0, with no renderer', () => {
    const settings = baseSettings({ grid: { cellSize: 40 } }); // default: highlights -> none
    const cells = hybridAlgorithm.generate({ imageData, settings });
    const highlightCells = cells.filter((c) => c.luminance >= settings.hybrid.boundaries.lightMidtonesMax);
    expect(highlightCells.length).toBeGreaterThan(0);
    for (const cell of highlightCells) {
      expect(cell.active).toBe(false);
      expect(cell.size).toBe(0);
      expect(cell.rendererId).toBeUndefined();
    }
  });

  it('D. different tonal regions route to different renderers in the same render', () => {
    const settings = baseSettings({ grid: { cellSize: 40 } });
    const cells = hybridAlgorithm.generate({ imageData, settings });

    const byStripe = (gray: number) => cells.filter((c) => Math.abs(c.luminance - gray) < 1);
    // .length checks first so a broken stripe/grid alignment (an empty
    // array) can't make the .every() below vacuously pass.
    expect(byStripe(10).length).toBeGreaterThan(0);
    expect(byStripe(10).every((c) => c.rendererId === 'pixel')).toBe(true); // shadows -> Solid Pixel
    expect(byStripe(100).length).toBeGreaterThan(0);
    expect(byStripe(100).every((c) => c.rendererId === 'square')).toBe(true); // dark midtones -> Square
    expect(byStripe(160).length).toBeGreaterThan(0);
    expect(byStripe(160).every((c) => c.rendererId === 'circle')).toBe(true); // light midtones -> Circle
    expect(byStripe(220).length).toBeGreaterThan(0);
    expect(byStripe(220).every((c) => c.rendererId === undefined)).toBe(true); // highlights -> None

    // All four mark treatments actually appeared -- this is the whole
    // point of Hybrid Raster, so assert it directly rather than just
    // trusting the per-stripe checks above.
    const rendererIdsSeen = new Set(cells.map((c) => c.rendererId ?? 'none'));
    expect(rendererIdsSeen).toEqual(new Set(['pixel', 'square', 'circle', 'none']));
  });

  it('E. changing the global renderer selection does not alter tonal classification or per-cell routing', () => {
    const settingsA = baseSettings({ grid: { cellSize: 40 }, renderer: 'circle' });
    const settingsB = baseSettings({ grid: { cellSize: 40 }, renderer: 'pixel' });
    const cellsA = hybridAlgorithm.generate({ imageData, settings: settingsA });
    const cellsB = hybridAlgorithm.generate({ imageData, settings: settingsB });

    expect(cellsA.length).toBe(cellsB.length);
    for (let i = 0; i < cellsA.length; i++) {
      expect(cellsB[i].active).toBe(cellsA[i].active);
      expect(cellsB[i].size).toBe(cellsA[i].size);
      expect(cellsB[i].rendererId).toBe(cellsA[i].rendererId);
    }
  });

  it('mark size comes from the classified region, not a global value', () => {
    const settings = baseSettings({ grid: { cellSize: 40 } });
    const cells = hybridAlgorithm.generate({ imageData, settings });
    const shadowCell = cells.find((c) => Math.abs(c.luminance - 10) < 1)!;
    const darkMidCell = cells.find((c) => Math.abs(c.luminance - 100) < 1)!;
    const lightMidCell = cells.find((c) => Math.abs(c.luminance - 160) < 1)!;
    expect(shadowCell.size).toBe(settings.hybrid.regions.shadows.markSize);
    expect(darkMidCell.size).toBe(settings.hybrid.regions.darkMidtones.markSize);
    expect(lightMidCell.size).toBe(settings.hybrid.regions.lightMidtones.markSize);
  });
});
