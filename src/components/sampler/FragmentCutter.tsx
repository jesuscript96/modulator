import React, { useState, useMemo, useCallback } from 'react';
import { Scissors } from 'lucide-react';
import WaveformDisplay from './WaveformDisplay';
import HelpTooltip from '../shared/HelpTooltip';

interface FragmentCutterProps {
  waveformData: number[];
  audioBuffer: AudioBuffer;
  onCut: (startSample: number, endSample: number, name: string) => void;
}

function detectTransients(data: number[], threshold = 0.3): number[] {
  const markers: number[] = [];
  const windowSize = Math.max(1, Math.floor(data.length / 50));
  for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
    const prev = data.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize;
    const curr = data.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;
    if (prev > 0 && curr / prev > 1 + threshold) {
      markers.push(i);
    }
  }
  return markers;
}

export default function FragmentCutter({ waveformData, audioBuffer, onCut }: FragmentCutterProps) {
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(100);
  const [cutName, setCutName] = useState('Fragment');

  const transients = useMemo(() => detectTransients(waveformData), [waveformData]);
  const totalSamples = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  const startSample = Math.floor((rangeStart / 100) * totalSamples);
  const endSample = Math.floor((rangeEnd / 100) * totalSamples);
  const durationMs = ((endSample - startSample) / sampleRate) * 1000;

  const handleCut = useCallback(() => {
    if (endSample <= startSample) return;
    onCut(startSample, endSample, cutName);
  }, [startSample, endSample, cutName, onCut]);

  const selStart = Math.floor((rangeStart / 100) * waveformData.length);
  const selEnd = Math.floor((rangeEnd / 100) * waveformData.length);

  return (
    <div className="border border-black p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          Fragment Cutter
          <HelpTooltip
            title="Fragment Cutter"
            technical="Selecciona un rango del audio y extrae un fragmento como nuevo clip. Los marcadores automáticos detectan transitorios mediante diferencia de energía RMS."
            beginner="Elige qué parte de la canción quieres recortar. Los marcadores naranjas indican dónde hay golpes o cambios fuertes en el sonido."
          />
        </h4>
        <span className="text-[10px] font-mono text-black/40">
          {durationMs.toFixed(0)}ms · {transients.length} transients
        </span>
      </div>

      {/* Waveform with selection */}
      <div className="relative">
        <WaveformDisplay
          data={waveformData}
          currentStep={0}
          totalSteps={16}
          selectionStart={selStart}
          selectionEnd={selEnd}
          height={80}
        />
        {/* Transient markers */}
        {transients.map((t, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-[1px] bg-orange-500/50"
            style={{ left: `${(t / waveformData.length) * 100}%` }}
          />
        ))}
      </div>

      {/* Range sliders */}
      <div className="flex gap-3 items-center text-xs">
        <label className="flex flex-col gap-1 flex-grow">
          <span className="uppercase tracking-widest text-[9px]">Start</span>
          <input
            type="range"
            min="0"
            max="100"
            value={rangeStart}
            onChange={(e) => setRangeStart(Math.min(parseInt(e.target.value), rangeEnd - 1))}
            className="accent-black w-full"
          />
        </label>
        <label className="flex flex-col gap-1 flex-grow">
          <span className="uppercase tracking-widest text-[9px]">End</span>
          <input
            type="range"
            min="0"
            max="100"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(Math.max(parseInt(e.target.value), rangeStart + 1))}
            className="accent-black w-full"
          />
        </label>
      </div>

      {/* Name + Cut button */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={cutName}
          onChange={(e) => setCutName(e.target.value)}
          className="flex-grow bg-transparent border border-black/20 px-2 py-1 text-xs font-mono outline-none focus:border-black"
          placeholder="Fragment name"
        />
        <button
          onClick={handleCut}
          className="border border-black px-3 py-1 text-xs uppercase tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center gap-1.5"
        >
          <Scissors className="w-3 h-3" />
          Cut
        </button>
      </div>
    </div>
  );
}
