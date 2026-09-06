import { useRef } from 'react';
import { useStore } from '../state/store';

interface TopBarProps {
  onFile: (file: File) => void;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onFit: () => void;
  canvasEl: HTMLCanvasElement | null;
  hasImage: boolean;
  /** Force an exact full-resolution render before reading pixels back out
   * of the canvas -- guards export against ever capturing an interim
   * low-res preview frame. */
  onBeforeExport?: () => void;
}

export function TopBar({
  onFile,
  showOriginal,
  onToggleOriginal,
  zoom,
  onZoomChange,
  onFit,
  canvasEl,
  hasImage,
  onBeforeExport,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reset = useStore((s) => s.reset);

  function handleExport() {
    if (!canvasEl) return;
    onBeforeExport?.();
    canvasEl.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raster-lab-export.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <header className="top-bar">
      <div className="top-bar-brand">RASTER LAB</div>

      <div className="top-bar-group">
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          Open Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={onToggleOriginal} disabled={!hasImage} aria-pressed={showOriginal}>
          {showOriginal ? 'Show Processed' : 'Show Original'}
        </button>
      </div>

      <div className="top-bar-group">
        <button className="btn btn-icon" onClick={() => onZoomChange(Math.max(0.1, zoom - 0.25))} aria-label="Zoom out">
          −
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-icon" onClick={() => onZoomChange(zoom + 0.25)} aria-label="Zoom in">
          +
        </button>
        <button className="btn" onClick={onFit}>
          Fit
        </button>
        <button className="btn" onClick={() => onZoomChange(1)}>
          100%
        </button>
      </div>

      <div className="top-bar-group top-bar-group-end">
        <button className="btn" onClick={reset}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={handleExport} disabled={!hasImage}>
          Export PNG
        </button>
      </div>
    </header>
  );
}
