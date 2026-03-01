import React from 'react';
import { Play, Square } from 'lucide-react';
import NumberDisplay from '../shared/NumberDisplay';

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  fractalDimension?: number;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
}

export default function TransportBar({
  isPlaying,
  bpm,
  currentStep,
  fractalDimension,
  onTogglePlay,
  onBpmChange,
}: TransportBarProps) {
  const beat = Math.floor(currentStep / 4) + 1;
  const sixteenth = (currentStep % 4) + 1;

  return (
    <div className="border-t border-black bg-[#f4f4f0] px-4 py-2 flex items-center gap-6">
      {/* Play/Stop */}
      <button
        onClick={onTogglePlay}
        className="border border-black w-8 h-8 flex items-center justify-center hover:bg-black hover:text-[#f4f4f0] transition-colors"
      >
        {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* BPM */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={bpm}
          onChange={(e) => onBpmChange(Math.max(20, Math.min(300, parseInt(e.target.value) || 120)))}
          className="w-14 bg-transparent border border-black/20 text-center font-mono text-sm font-bold outline-none focus:border-black"
        />
        <span className="text-[9px] uppercase tracking-widest text-black/40">BPM</span>
      </div>

      {/* Position */}
      <div className="font-mono text-sm">
        <span className="text-black/40 text-[9px] uppercase tracking-widest mr-2">Position</span>
        <span className="font-bold">{beat}</span>
        <span className="text-black/30">.</span>
        <span>{sixteenth}</span>
      </div>

      {/* Step counter */}
      <NumberDisplay value={currentStep} label="step" decimals={0} size="sm" />

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Fractal dimension (if available) */}
      {fractalDimension !== undefined && (
        <div className="font-mono text-xs text-black/50">
          <span className="text-[9px] uppercase tracking-widest mr-1">D</span>
          <span className="font-bold text-black">{fractalDimension.toFixed(3)}</span>
        </div>
      )}

      {/* Coordinates */}
      <div className="font-mono text-[10px] text-black/40">
        (t, p) = ({(currentStep * (60 / bpm / 4) * 1000).toFixed(0)}ms, —)
      </div>
    </div>
  );
}
