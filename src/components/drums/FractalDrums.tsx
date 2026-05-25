import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FractalSequencer } from '../../engine/FractalSequencer';
import { mandelbrotIterations } from '../../engine/math/mandelbrot';
import type { RhythmMode } from '../../types';
import type { LSystemPreset } from '../../engine/math/lsystem';
import HelpTooltip from '../shared/HelpTooltip';
import helpContent from '../../data/helpContent';

interface FractalDrumsProps {
  sequencer: FractalSequencer;
  onModeChange: (mode: RhythmMode) => void;
  onPatternChange?: () => void;
}

export default function FractalDrums({ sequencer, onModeChange, onPatternChange }: FractalDrumsProps) {
  const [mode, setMode] = useState<RhythmMode>('euclidean');
  const [preset, setPreset] = useState<LSystemPreset>('algae');
  const [iterations, setIterations] = useState(4);
  const [fractalDim, setFractalDim] = useState(1);
  const [mandelbrotCy, setMandelbrotCy] = useState(0);

  const handleModeChange = useCallback(
    (m: RhythmMode) => {
      setMode(m);
      sequencer.setMode(m);
      onModeChange(m);
      setFractalDim(sequencer.fractalDimension);
      onPatternChange?.();
    },
    [sequencer, onModeChange, onPatternChange]
  );

  const handlePresetChange = useCallback(
    (p: LSystemPreset) => {
      setPreset(p);
      sequencer.setLSystemPreset(p, iterations);
      setFractalDim(sequencer.fractalDimension);
      onPatternChange?.();
    },
    [sequencer, iterations, onPatternChange]
  );

  const handleIterationsChange = useCallback(
    (n: number) => {
      setIterations(n);
      sequencer.setIterations(n);
      setFractalDim(sequencer.fractalDimension);
      onPatternChange?.();
    },
    [sequencer, onPatternChange]
  );

  // Trigger onPatternChange when mandelbrotCy changes (since it recalculates Mandelbrot patterns)
  useEffect(() => {
    if (mode === 'mandelbrot') {
      onPatternChange?.();
    }
  }, [mandelbrotCy, mode, onPatternChange]);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode selector */}
      <div className="flex items-center gap-2">
        <h4 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          Rhythm Mode
          <HelpTooltip
            title="Rhythm Modes"
            technical="Euclidiano usa Bjorklund, L-System usa gramáticas formales con reescritura paralela, Mandelbrot usa iteraciones del plano complejo z²+c."
            beginner="Tres formas de crear ritmos: regular (Euclidiano), tipo árbol que crece (L-System), o navegando un fractal (Mandelbrot)."
          />
        </h4>
      </div>
      <div className="flex gap-1">
        {(['euclidean', 'lsystem', 'mandelbrot'] as RhythmMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 text-[10px] uppercase tracking-widest py-1.5 border transition-colors ${
              mode === m
                ? 'border-black bg-black text-[#f4f4f0]'
                : 'border-black/20 hover:border-black/40'
            }`}
          >
            {m === 'lsystem' ? 'L-System' : m}
          </button>
        ))}
      </div>

      {/* L-System controls */}
      {mode === 'lsystem' && (
        <div className="flex flex-col gap-2 border border-black/20 p-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest">Preset</span>
            <HelpTooltip {...helpContent.lsystem} />
          </div>
          <select
            className="bg-transparent border border-black/20 px-2 py-1 text-xs font-mono outline-none"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as LSystemPreset)}
          >
            <option value="algae">Algae (A→AB, B→A)</option>
            <option value="tree">Tree (A→B[A]A, B→BB)</option>
            <option value="koch">Koch (A→ABBA, B→BBB)</option>
            <option value="cantor">Cantor (A→A[A, [→[[[)</option>
            <option value="thueMorse">Thue-Morse (A→AB, B→BA)</option>
          </select>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest flex justify-between">
              <span>Iterations</span>
              <span className="font-mono">{iterations}</span>
            </span>
            <input
              type="range"
              min="1"
              max="8"
              value={iterations}
              onChange={(e) => handleIterationsChange(parseInt(e.target.value))}
              className="accent-black"
            />
          </label>

          <div className="text-[10px] font-mono text-black/50">
            Pattern length: {sequencer.getLSystemSequence().length} steps
          </div>
        </div>
      )}

      {/* Mandelbrot controls */}
      {mode === 'mandelbrot' && (
        <div className="flex flex-col gap-2 border border-black/20 p-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest">Mandelbrot Explorer</span>
            <HelpTooltip {...helpContent.mandelbrotDrums} />
          </div>
          <MandelbrotMiniCanvas cy={mandelbrotCy} onCyChange={setMandelbrotCy} />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest flex justify-between">
              <span>Scan line (cy)</span>
              <span className="font-mono">{mandelbrotCy.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min="-200"
              max="200"
              value={Math.round(mandelbrotCy * 100)}
              onChange={(e) => setMandelbrotCy(parseInt(e.target.value) / 100)}
              className="accent-black"
            />
          </label>
        </div>
      )}

      {/* Fractal dimension */}
      {mode !== 'euclidean' && (
        <div className="text-xs font-mono border-t border-black/20 pt-2 flex justify-between">
          <span className="text-black/50">Fractal Dimension</span>
          <span className="font-bold">{fractalDim.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}

function MandelbrotMiniCanvas({
  cy,
  onCyChange,
}: {
  cy: number;
  onCyChange: (cy: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 200;
  const H = 100;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(W, H);
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const cx = -2 + (px / W) * 2.5;
        const cyVal = -1 + (py / H) * 2;
        const iter = mandelbrotIterations(cx, cyVal, 40);
        const idx = (py * W + px) * 4;
        if (iter >= 40) {
          imgData.data[idx] = 17;
          imgData.data[idx + 1] = 17;
          imgData.data[idx + 2] = 17;
        } else {
          const t = iter / 40;
          imgData.data[idx] = Math.floor(t * 200 + 55);
          imgData.data[idx + 1] = Math.floor(t * 150 + 50);
          imgData.data[idx + 2] = Math.floor(t * 100 + 50);
        }
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const scanY = ((cy + 1) / 2) * H;
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(W, scanY);
    ctx.stroke();
  }, [cy]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newCy = -1 + (y / H) * 2;
      onCyChange(Math.max(-2, Math.min(2, newCy)));
    },
    [onCyChange]
  );

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full border border-black/20 cursor-crosshair"
      style={{ imageRendering: 'pixelated' }}
      onClick={handleClick}
    />
  );
}
