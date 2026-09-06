import { useEffect, useRef, useState } from 'react';
import { useStore, type Store } from '../state/store';
import { imageToImageData, imageToPreviewImageData, runPipeline } from '../engine/render/pipeline';

interface CanvasViewProps {
  imageEl: HTMLImageElement | null;
  showOriginal: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  fitToken: number; // bump to trigger a re-fit
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Lets a parent (the export button) force one exact, full-resolution
   * render on demand, even if a low-res preview render is currently
   * showing or a debounced settle is still pending. */
  registerExportApi?: (api: { renderFull: () => void }) => void;
}

// Longest edge, in px, of the cheap interim copy used while a control is
// being actively dragged. Small enough to be fast on large source images,
// big enough that the coarse preview still reads as "the same image".
const PREVIEW_MAX_DIM = 400;
// How long to wait after the last change before committing to an exact,
// full-resolution render.
const SETTLE_DELAY_MS = 120;

export function CanvasView({
  imageEl,
  showOriginal,
  zoom,
  onZoomChange,
  fitToken,
  canvasRef,
  registerExportApi,
}: CanvasViewProps) {
  const sourceDataRef = useRef<ImageData | null>(null);
  const previewSourceRef = useRef<{ imageData: ImageData; scale: number } | null>(null);
  // A detached canvas the low-res pass renders into; never attached to the
  // DOM, so resizing it for the preview never touches on-screen layout.
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!previewCanvasRef.current) {
    previewCanvasRef.current = document.createElement('canvas');
  }
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

  // Pending low-res (rAF) and full-res (debounce) work, so a newer change
  // can always cancel a stale one already in flight.
  const rafIdRef = useRef<number | null>(null);
  const settleIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelScheduled() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (settleIdRef.current !== null) {
      clearTimeout(settleIdRef.current);
      settleIdRef.current = null;
    }
  }

  // Always-current settings/showOriginal, readable outside the render
  // effect (the exported "renderFull" API can be invoked at any time, not
  // just right after a render).
  const latestRef = useRef({ settings, showOriginal });
  useEffect(() => {
    latestRef.current = { settings, showOriginal };
  });

  // Cache a clean full-res copy of the source pixels, plus a small
  // downscaled copy for interim preview rendering, whenever a new image
  // loads. preprocess() always reads from the untouched full-res copy, so
  // the source is never destructively modified.
  useEffect(() => {
    if (imageEl) {
      sourceDataRef.current = imageToImageData(imageEl);
      previewSourceRef.current = imageToPreviewImageData(imageEl, PREVIEW_MAX_DIM);
    } else {
      sourceDataRef.current = null;
      previewSourceRef.current = null;
    }
  }, [imageEl]);

  // Distinguish "structural" changes (a new image loaded, or the
  // original/processed view was switched) from ordinary parameter changes,
  // so only the latter gets the low-res-preview treatment -- loading an
  // image or flipping the toggle should show its exact result immediately,
  // with no interim blocky flash.
  const prevImageRef = useRef(imageEl);
  const prevShowOriginalRef = useRef(showOriginal);

  // Re-run the pipeline whenever any relevant setting (or the image, or the
  // original/processed toggle) changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    cancelScheduled();
    if (!canvas) return;

    if (!sourceDataRef.current) {
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#e8e8e6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      prevImageRef.current = imageEl;
      prevShowOriginalRef.current = showOriginal;
      return;
    }

    if (showOriginal) {
      canvas.width = sourceDataRef.current.width;
      canvas.height = sourceDataRef.current.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.putImageData(sourceDataRef.current, 0, 0);
      prevImageRef.current = imageEl;
      prevShowOriginalRef.current = showOriginal;
      return;
    }

    const structural = imageEl !== prevImageRef.current || showOriginal !== prevShowOriginalRef.current;
    prevImageRef.current = imageEl;
    prevShowOriginalRef.current = showOriginal;

    if (structural || !previewSourceRef.current) {
      // New image, or just switched back from the original view: render
      // the exact result immediately. No preview flash.
      runPipeline(sourceDataRef.current, canvas, settings);
      return;
    }

    // An image-processing / algorithm / renderer / color / grid parameter
    // changed while an image is already showing -- this is the case a
    // dragged slider hits many times a second. Two-step response:
    //
    //  1. Immediately (next animation frame) draw a cheap low-resolution
    //     pass, scaled back up onto the full-size canvas, so the user sees
    //     their change reflected without delay.
    //  2. Once changes stop for SETTLE_DELAY_MS, run the real pipeline at
    //     full resolution, replacing the preview with the exact result.
    //
    // Rapid successive changes just keep cancelling and re-scheduling both
    // of these, which naturally coalesces a whole drag gesture down to
    // ~1 low-res render per frame plus a single full-res render at the end.
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const preview = previewSourceRef.current;
      const full = sourceDataRef.current;
      if (!preview || !full) return;

      // The visible canvas always stays at full resolution -- only the
      // detail of what's drawn into it changes -- so on-screen size never
      // jumps during a drag.
      if (canvas.width !== full.width || canvas.height !== full.height) {
        canvas.width = full.width;
        canvas.height = full.height;
      }

      // Scale the grid down to match the shrunk source, so the preview
      // shows roughly the same number of cells (and thus the same overall
      // pattern) as the full-resolution result will.
      const scaledCellSize = Math.max(1, Math.round(settings.grid.cellSize * preview.scale));
      const previewSettings: Store = { ...settings, grid: { ...settings.grid, cellSize: scaledCellSize } };

      const off = previewCanvasRef.current!;
      runPipeline(preview.imageData, off, previewSettings);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    });

    settleIdRef.current = setTimeout(() => {
      settleIdRef.current = null;
      runPipeline(sourceDataRef.current!, canvas, settings);
    }, SETTLE_DELAY_MS);

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

  // Cancel any in-flight preview/settle work on unmount.
  useEffect(() => cancelScheduled, []);

  // Let the parent (Export button) force an exact full-resolution render
  // before reading pixels back out of the canvas, regardless of whether a
  // low-res preview or pending settle is currently in flight.
  useEffect(() => {
    if (!registerExportApi) return;
    registerExportApi({
      renderFull: () => {
        const canvas = canvasRef.current;
        const { settings: s, showOriginal: orig } = latestRef.current;
        // The original view is already an exact, unprocessed copy -- there
        // is nothing to re-render.
        if (!canvas || !sourceDataRef.current || orig) return;
        cancelScheduled();
        runPipeline(sourceDataRef.current, canvas, s);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerExportApi]);

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
