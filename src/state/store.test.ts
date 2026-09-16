import { describe, expect, it, beforeEach } from 'vitest';
import { useStore } from './store';
import { defaultState } from './defaults';

// zustand stores are just plain JS state containers -- no DOM needed to
// exercise them, so these run against the real store the app uses.
beforeEach(() => {
  useStore.setState(structuredClone(defaultState));
});

describe('setHybridBoundary', () => {
  it('B. moves a boundary within its bounds', () => {
    useStore.getState().setHybridBoundary('darkMidtonesMax', 140);
    expect(useStore.getState().hybrid.boundaries.darkMidtonesMax).toBe(140);
  });

  it('B. clamps a boundary so it can never cross or touch its lower neighbor', () => {
    const { setHybridBoundary } = useStore.getState();
    setHybridBoundary('darkMidtonesMax', 10); // shadowsMax is 64 by default -- would invert
    const b = useStore.getState().hybrid.boundaries;
    expect(b.darkMidtonesMax).toBeGreaterThan(b.shadowsMax);
  });

  it('B. clamps a boundary so it can never cross or touch its upper neighbor', () => {
    const { setHybridBoundary } = useStore.getState();
    setHybridBoundary('darkMidtonesMax', 250); // lightMidtonesMax is 192 by default -- would invert
    const b = useStore.getState().hybrid.boundaries;
    expect(b.darkMidtonesMax).toBeLessThan(b.lightMidtonesMax);
  });

  it('B. the outer boundaries stay within the valid 1..254 range', () => {
    const { setHybridBoundary } = useStore.getState();
    setHybridBoundary('shadowsMax', -50);
    expect(useStore.getState().hybrid.boundaries.shadowsMax).toBeGreaterThanOrEqual(1);
    setHybridBoundary('lightMidtonesMax', 9999);
    expect(useStore.getState().hybrid.boundaries.lightMidtonesMax).toBeLessThanOrEqual(254);
  });

  it('B. repeated adversarial drags never produce an invalid (unordered) boundary set', () => {
    const { setHybridBoundary } = useStore.getState();
    const keys = ['shadowsMax', 'darkMidtonesMax', 'lightMidtonesMax'] as const;
    const attempts = [300, -100, 128, 128, 0, 255, 64, 190, 65];
    for (const value of attempts) {
      for (const key of keys) {
        setHybridBoundary(key, value);
        const b = useStore.getState().hybrid.boundaries;
        expect(b.shadowsMax).toBeLessThan(b.darkMidtonesMax);
        expect(b.darkMidtonesMax).toBeLessThan(b.lightMidtonesMax);
      }
    }
  });
});

describe('setHybridRegion', () => {
  it('updates only the targeted region, leaving the others untouched', () => {
    const before = useStore.getState().hybrid.regions;
    useStore.getState().setHybridRegion('highlights', { markType: 'circle', markSize: 0.4 });
    const after = useStore.getState().hybrid.regions;
    expect(after.highlights).toEqual({ markType: 'circle', markSize: 0.4 });
    expect(after.shadows).toEqual(before.shadows);
    expect(after.darkMidtones).toEqual(before.darkMidtones);
    expect(after.lightMidtones).toEqual(before.lightMidtones);
  });
});

describe('reset', () => {
  it('H. restores the Hybrid default configuration after arbitrary edits', () => {
    const { setHybridBoundary, setHybridRegion, setAlgorithm, reset } = useStore.getState();
    setAlgorithm('hybrid');
    setHybridBoundary('darkMidtonesMax', 140);
    setHybridRegion('shadows', { markType: 'none', markSize: 0 });
    reset();
    expect(useStore.getState().hybrid).toEqual(defaultState.hybrid);
    expect(useStore.getState().algorithm).toBe(defaultState.algorithm);
  });
});
