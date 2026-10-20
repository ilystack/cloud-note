import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface ColorWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  color: string;
  onChange: (hexColor: string) => void;
}

// Convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

// Convert Hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 38, s: 100, l: 60 };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  isOpen,
  onClose,
  color,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Internal HSL state
  const [hsl, setHsl] = useState(() => hexToHsl(color || '#F59E0B'));
  const alpha = 100;
  const [hexInput, setHexInput] = useState(() => (color || '#F59E0B').replace('#', '').toUpperCase());
  const [copied, setCopied] = useState(false);
  const isDraggingWheel = useRef(false);

  // Sync when initial color prop changes while opened
  useEffect(() => {
    if (color && !isDraggingWheel.current) {
      const parsed = hexToHsl(color);
      setHsl(parsed);
      setHexInput(color.replace('#', '').toUpperCase());
    }
  }, [color]);

  // Draw circular color wheel canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    // Render radial conic gradient
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = Math.min(1, dist / radius);
          // Standard HSV to RGB conversion for rich gamut wheel
          const hNorm = angle / 60;
          const i = Math.floor(hNorm);
          const f = hNorm - i;
          const p = 1 - sat;
          const q = 1 - sat * f;
          const t = 1 - sat * (1 - f);

          let r = 0, g = 0, b = 0;
          switch (i % 6) {
            case 0: r = 1; g = t; b = p; break;
            case 1: r = q; g = 1; b = p; break;
            case 2: r = p; g = 1; b = t; break;
            case 3: r = p; g = q; b = 1; break;
            case 4: r = t; g = p; b = 1; break;
            case 5: r = 1; g = p; b = q; break;
          }

          const idx = (y * size + x) * 4;
          data[idx] = Math.round(r * 255);
          data[idx + 1] = Math.round(g * 255);
          data[idx + 2] = Math.round(b * 255);
          // Antialiased edge
          const edgeAlpha = Math.min(1, Math.max(0, radius - dist));
          data[idx + 3] = Math.round(edgeAlpha * 255);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [isOpen]);

  // Handle interaction on the color wheel
  const handleWheelPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const newH = Math.round(angle);
      const newS = Math.round((dist / radius) * 100);

      const nextHsl = { ...hsl, h: newH, s: newS };
      setHsl(nextHsl);

      const hex = hslToHex(nextHsl.h, nextHsl.s, nextHsl.l);
      setHexInput(hex.replace('#', ''));
      onChange(hex);
    },
    [hsl, onChange]
  );

  const onMouseDownWheel = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingWheel.current = true;
    handleWheelPointer(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (isDraggingWheel.current) {
        handleWheelPointer(ev.clientX, ev.clientY);
      }
    };
    const onMouseUp = () => {
      isDraggingWheel.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onTouchStartWheel = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      isDraggingWheel.current = true;
      handleWheelPointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMoveWheel = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingWheel.current && e.touches.length > 0) {
      handleWheelPointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEndWheel = () => {
    isDraggingWheel.current = false;
  };

  // Lightness Slider
  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newL = parseInt(e.target.value, 10);
    const nextHsl = { ...hsl, l: newL };
    setHsl(nextHsl);
    const hex = hslToHex(nextHsl.h, nextHsl.s, newL);
    setHexInput(hex.replace('#', ''));
    onChange(hex);
  };

  // Manual Hex Input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase();
    setHexInput(val);
    if (val.length === 6) {
      const parsed = hexToHsl('#' + val);
      setHsl(parsed);
      onChange('#' + val);
    }
  };

  // Copy Hex to clipboard
  const handleCopyHex = async () => {
    const currentHex = '#' + hexInput;
    try {
      await navigator.clipboard.writeText(currentHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate picker handle position on the wheel
  const wheelRadiusPx = 90; // for 180px diameter
  const handleAngleRad = (hsl.h * Math.PI) / 180;
  const handleDist = (hsl.s / 100) * wheelRadiusPx;
  const handleX = wheelRadiusPx + handleDist * Math.cos(handleAngleRad);
  const handleY = wheelRadiusPx + handleDist * Math.sin(handleAngleRad);

  const currentHex = '#' + hexInput;

  return (
    <div
      ref={containerRef}
      className="absolute top-12 left-24 z-50 w-72 rounded-2xl bg-white dark:bg-[#18191e] border border-slate-200 dark:border-neutral-800 p-5 shadow-2xl select-none animate-modal-in"
      style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.35)' }}
    >
      {/* Top Header with Close Button */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
          Color Wheel
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close color wheel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Circular Color Wheel with Selector Ring */}
      <div className="relative w-[180px] h-[180px] mx-auto my-2 flex items-center justify-center cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="rounded-full shadow-inner block"
          onMouseDown={onMouseDownWheel}
          onTouchStart={onTouchStartWheel}
          onTouchMove={onTouchMoveWheel}
          onTouchEnd={onTouchEndWheel}
        />

        {/* Floating Ring Handle (matching user's ○) */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${handleX}px`,
            top: `${handleY}px`,
            backgroundColor: currentHex,
            boxShadow: '0 0 4px rgba(0,0,0,0.6), inset 0 0 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Hex Controls Bar */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        <button
          type="button"
          onClick={handleCopyHex}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#202228] dark:hover:bg-[#2a2d36] text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-neutral-700/60"
          title="Copy Hex Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#202228] border border-slate-200/80 dark:border-neutral-700/60">
          <span className="text-xs font-mono text-slate-400 dark:text-neutral-500 mr-1.5 font-bold">#</span>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            className="w-20 bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-neutral-100 uppercase focus:outline-none tracking-wider text-center"
            maxLength={6}
          />
        </div>

        <div
          className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-neutral-700/60 shadow-sm flex-shrink-0"
          style={{ backgroundColor: currentHex }}
          title={`Active color: ${currentHex}`}
        />
      </div>

      {/* Lightness Slider */}
      <div className="mt-4 px-1">
        <input
          type="range"
          min="10"
          max="95"
          value={hsl.l}
          onChange={handleLightnessChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500"
          style={{
            background: `linear-gradient(to right, #000000, ${hslToHex(hsl.h, hsl.s, 50)}, #ffffff)`,
          }}
          title={`Lightness: ${hsl.l}%`}
        />
      </div>

      {/* 4 Bottom Cards: H, S, L, A */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-slate-50 dark:bg-[#202228] border border-slate-200/80 dark:border-neutral-800/80 text-center">
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 font-mono">
            {hsl.h}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium mt-0.5">
            H
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-slate-50 dark:bg-[#202228] border border-slate-200/80 dark:border-neutral-800/80 text-center">
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 font-mono">
            {hsl.s}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium mt-0.5">
            S
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-slate-50 dark:bg-[#202228] border border-slate-200/80 dark:border-neutral-800/80 text-center">
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 font-mono">
            {hsl.l}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium mt-0.5">
            L
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-slate-50 dark:bg-[#202228] border border-slate-200/80 dark:border-neutral-800/80 text-center">
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 font-mono">
            {alpha}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium mt-0.5">
            A
          </span>
        </div>
      </div>
    </div>
  );
};
