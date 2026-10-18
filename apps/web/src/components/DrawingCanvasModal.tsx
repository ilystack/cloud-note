import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Undo, RotateCcw, PenTool } from 'lucide-react';
import { Stroke, Point } from '@cloudnotes/shared-types';

interface DrawingCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drawingSvgHtml: string) => void;
}

export const DrawingCanvasModal: React.FC<DrawingCanvasModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>('#F59E0B');
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Point[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 600 * dpr;
    canvas.height = 360 * dpr;
    ctx.scale(dpr, dpr);
    redraw(ctx);
  }, [isOpen]);

  const redraw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 600, 360);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    currentStroke.current = [{ x, y }];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prev = currentStroke.current[currentStroke.current.length - 1];
    currentStroke.current.push({ x, y });

    ctx.beginPath();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.current.length > 1) {
      setStrokes(prev => [...prev, { color: brushColor, width: brushWidth, points: [...currentStroke.current] }]);
    }
    currentStroke.current = [];
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, 600, 360);
      ctx.save();
      ctx.scale(dpr, dpr);
      redraw(ctx);
      ctx.restore();
    }
  };

  const handleClear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveAndEmbed = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const embedHtml = `<div class="cloudnotes-drawing my-3"><img src="${dataUrl}" alt="Handwritten Sketch" class="rounded-lg border border-slate-700 max-w-full" /></div>`;
    onSave(embedHtml);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-in">
      <div className="relative w-full max-w-2xl rounded-2xl modal-surface p-6 text-left select-none">
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-neutral-100 text-sm tracking-tight">Freehand Sketch Canvas</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Draw diagrams, signatures, or quick handwriting</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202126] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">Color:</span>
            <div className="flex items-center space-x-1.5">
              {['#F59E0B', '#10B981', '#3B82F6', '#F43F5E', '#FFFFFF', '#64748B'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBrushColor(color)}
                  className={`w-4 h-4 rounded-full transition-transform ${brushColor === color ? 'ring-2 ring-amber-500 dark:ring-white ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#141518] scale-110' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">Stroke:</label>
            <input
              type="range"
              min="1"
              max="12"
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="w-18 accent-amber-500 h-1 bg-slate-300 dark:bg-neutral-800 rounded"
            />
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-[#1c1d22] border border-slate-300 dark:border-neutral-800 hover:bg-slate-200 dark:hover:bg-[#25262c] text-slate-700 dark:text-neutral-300 disabled:opacity-30 transition-colors"
              title="Undo last stroke"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-[#1c1d22] border border-slate-300 dark:border-neutral-800 hover:bg-slate-200 dark:hover:bg-[#25262c] text-slate-700 dark:text-neutral-300 transition-colors"
              title="Clear entire canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center bg-slate-100 dark:bg-[#121214] rounded-xl border border-slate-300 dark:border-neutral-800 p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair w-full max-w-[600px] h-[360px] touch-none rounded-lg"
            style={{ width: '600px', height: '360px' }}
          />
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndEmbed}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Insert Sketch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
