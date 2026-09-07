import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { Slider } from './Slider';
import { algorithms } from '../engine/algorithms';
import { renderers } from '../engine/renderers';
import type { AlgorithmId, RendererId } from '../state/types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="control-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ControlPanel() {
  const {
    imageProcessing,
    setImageProcessing,
    algorithm,
    setAlgorithm,
    threshold,
    setThreshold,
    halftone,
    setHalftone,
    posterize,
    setPosterize,
    renderer,
    setRenderer,
    palette,
    setPalette,
    swapPalette,
    grid,
    setGrid,
  } = useStore();

  return (
    <div className="control-panel">
      <Section title="Image Processing">
        <label className="control-row control-row-checkbox">
          <span className="control-label">Grayscale</span>
          <input
            type="checkbox"
            checked={imageProcessing.grayscale}
            onChange={(e) => setImageProcessing({ grayscale: e.target.checked })}
          />
        </label>
        <Slider
          label="Brightness"
          value={imageProcessing.brightness}
          min={-100}
          max={100}
          onChange={(v) => setImageProcessing({ brightness: v })}
        />
        <Slider
          label="Contrast"
          value={imageProcessing.contrast}
          min={-100}
          max={100}
          onChange={(v) => setImageProcessing({ contrast: v })}
        />
        <Slider
          label="Gamma"
          value={imageProcessing.gamma}
          min={0.1}
          max={4}
          step={0.05}
          onChange={(v) => setImageProcessing({ gamma: v })}
        />
        <Slider
          label="Blur"
          value={imageProcessing.blur}
          min={0}
          max={20}
          onChange={(v) => setImageProcessing({ blur: v })}
          suffix="px"
        />
        <label className="control-row control-row-checkbox">
          <span className="control-label">Invert</span>
          <input
            type="checkbox"
            checked={imageProcessing.invert}
            onChange={(e) => setImageProcessing({ invert: e.target.checked })}
          />
        </label>
      </Section>

      <Section title="Raster Algorithm">
        <label className="control-row">
          <span className="control-label">Algorithm</span>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as AlgorithmId)}
          >
            {Object.values(algorithms).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        {algorithm === 'threshold' && (
          <Slider
            label="Threshold"
            value={threshold.threshold}
            min={0}
            max={255}
            onChange={(v) => setThreshold({ threshold: v })}
          />
        )}

        {algorithm === 'halftone' && (
          <>
            <Slider
              label="Min mark size"
              value={halftone.minMarkSize}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setHalftone({ minMarkSize: v })}
            />
            <Slider
              label="Max mark size"
              value={halftone.maxMarkSize}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setHalftone({ maxMarkSize: v })}
            />
            <label className="control-row control-row-checkbox">
              <span className="control-label">Invert tone mapping</span>
              <input
                type="checkbox"
                checked={halftone.invert}
                onChange={(e) => setHalftone({ invert: e.target.checked })}
              />
            </label>
          </>
        )}

        {algorithm === 'posterize' && (
          <Slider
            label="Levels"
            value={posterize.levels}
            min={2}
            max={8}
            onChange={(v) => setPosterize({ levels: v })}
          />
        )}
      </Section>

      <Section title="Grid">
        <Slider
          label="Cell size"
          value={grid.cellSize}
          min={2}
          max={60}
          onChange={(v) => setGrid({ cellSize: v })}
          suffix="px"
        />
      </Section>

      <Section title="Renderer">
        <label className="control-row">
          <span className="control-label">Mark shape</span>
          <select value={renderer} onChange={(e) => setRenderer(e.target.value as RendererId)}>
            {Object.values(renderers).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Color">
        <label className="control-row">
          <span className="control-label">Foreground</span>
          <input
            type="color"
            value={palette.foreground}
            onChange={(e) => setPalette({ foreground: e.target.value })}
          />
          <input
            type="text"
            className="hex-input"
            value={palette.foreground}
            onChange={(e) => setPalette({ foreground: e.target.value })}
          />
        </label>
        <label className="control-row">
          <span className="control-label">Background</span>
          <input
            type="color"
            value={palette.background}
            onChange={(e) => setPalette({ background: e.target.value })}
          />
          <input
            type="text"
            className="hex-input"
            value={palette.background}
            onChange={(e) => setPalette({ background: e.target.value })}
          />
        </label>
        <button className="btn btn-secondary" onClick={swapPalette}>
          Swap FG / BG
        </button>
      </Section>
    </div>
  );
}
