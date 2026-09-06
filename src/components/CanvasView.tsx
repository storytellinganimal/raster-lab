import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { imageToImageData, runPipeline } from '../engine/render/pipeline';

interface CanvasViewProps {
  imageEl: HTMLImageElement | null;
  showOriginal: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  fitToken: number; // bump to trigger a re-fit
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function CanvasView({ imageEl, showOriginal, zoom, onZoomChange, fitToken, canvasRef }: CanvasViewProps) {
  const sourceDataRef = useRef<ImageData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; panX: number; panY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });

  const settings = useStore();

  // Cache a clean copy of the source pixels whenever a new image loads.
  // preprocess() always reads from this untouched copy, never from a
  // previously-processed buffer, so the source is never destructively modified.
  useEffect(() => {
    if (imageEl) {
      sourceDataRef.current = imageToImageData(imageEl);
    } else {
      sourceDataRef.current = null;
    }
  }, [imageEl]);

  // Re-run the pipeline whenever any relevant setting (or the image, or the
  // original/processed toggle) changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!sourceDataRef.current) {
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#e8e8e6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    if (showOriginal) {
      canvas.width = sourceDataRef.current.width;
      canvas.height = sourceDataRef.current.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.putImageData(sourceDataRef.current, 0, 0);
      return;
    }

    runPipeline(sourceDataRef.current, canvas, settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageEl,
    showOriginal,
    settings.imageProcessing,
    settings.algorithm,
    settings.threshold,
    settings.halftone,
    settings.renderer,
    settings.palette,
    settings.grid,
  ]);

  // Reset pan when a new "fit" is requested.
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [fitToken]);

  // React's synthetic onWheel is attached as a passive listener, so
  // e.preventDefault() inside it silently fails (and logs a warning) --
  // we need a real, non-passive native listener to stop the page/trackpad
  // from scrolling while the user is zooming the canvas.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(Math.min(8, Math.max(0.1, zoomRef.current + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoomChange]);

  function handlePointerDown(e: React.PointerEvent) {
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  }
  function handlePointerUp() {
    dragState.current.dragging = false;
  }

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="canvas-stage"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <canvas ref={canvasRef} className="raster-canvas" />
      </div>
      {!imageEl && (
        <div className="canvas-empty-hint">Drop an image here, or use "Open Image" above</div>
      )}
    </div>
  );
}
