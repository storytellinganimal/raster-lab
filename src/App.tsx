import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { CanvasView } from './components/CanvasView';
import { ControlPanel } from './components/ControlPanel';
import { useStore } from './state/store';

function App() {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitToken, setFitToken] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      setFitToken((t) => t + 1);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  // Global drag & drop over the whole window.
  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
      setIsDraggingFile(true);
    }
    function onDragLeave(e: DragEvent) {
      if (e.relatedTarget === null) setIsDraggingFile(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setIsDraggingFile(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        loadFile(file);
      }
    }
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadFile]);

  // Keyboard shortcuts: I = invert, O = original/processed toggle.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'o' || e.key === 'O') {
        setShowOriginal((v) => !v);
      } else if (e.key === 'i' || e.key === 'I') {
        const s = useStore.getState();
        s.setImageProcessing({ invert: !s.imageProcessing.invert });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <TopBar
        onFile={loadFile}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((v) => !v)}
        zoom={zoom}
        onZoomChange={setZoom}
        onFit={() => {
          setZoom(1);
          setFitToken((t) => t + 1);
        }}
        canvasEl={canvasRef.current}
        hasImage={!!imageEl}
      />
      <div className="app-body">
        <main className="canvas-area">
          <CanvasView
            imageEl={imageEl}
            showOriginal={showOriginal}
            zoom={zoom}
            onZoomChange={setZoom}
            fitToken={fitToken}
            canvasRef={canvasRef}
          />
        </main>
        <aside className="sidebar">
          <ControlPanel />
        </aside>
      </div>
      {isDraggingFile && <div className="drop-overlay">Drop image to load</div>}
    </div>
  );
}

export default App;
