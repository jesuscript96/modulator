import React, { useState, useCallback } from 'react';
import { SpectralProcessor } from '../../engine/SpectralProcessor';
import { extractMelodyVectors } from '../../engine/math/melodyExtractor';
import type { SoundVector } from '../../types';
import SpectrogramView from './SpectrogramView';
import HelpTooltip from '../shared/HelpTooltip';

interface HPSSeparatorProps {
  audioBuffer: AudioBuffer | null;
  onSeparated?: (
    harmonic: AudioBuffer,
    percussive: AudioBuffer,
    melodyFreqs: number[],
    melodyVectors: SoundVector[]
  ) => void;
}

export default function HPSSeparator({ audioBuffer, onSeparated }: HPSSeparatorProps) {
  const [processing, setProcessing] = useState(false);
  const [medianSize, setMedianSize] = useState(17);
  const [result, setResult] = useState<{
    original: Float32Array[];
    harmonic: Float32Array[];
    percussive: Float32Array[];
    inverted: Float32Array[];
    melodyFreqs: number[];
  } | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'harmonic' | 'percussive' | 'inverted'>('original');

  const handleProcess = useCallback(async () => {
    if (!audioBuffer) return;
    setProcessing(true);

    // Use setTimeout to not block UI
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const processor = new SpectralProcessor(2048, 512);
        const data = audioBuffer.getChannelData(0);
        const { magnitude, phase } = processor.computeSTFT(data);
        const { harmonic, percussive } = processor.harmonicPercussiveSeparation(magnitude, medianSize);
        const melodyFreqs = processor.extractMelodyFrequencies(harmonic, audioBuffer.sampleRate);
        const inverted = processor.spectralInversion(magnitude);

        setResult({
          original: magnitude,
          harmonic,
          percussive,
          inverted,
          melodyFreqs,
        });

        if (onSeparated) {
          const harmonicAudio = processor.reconstructFromSTFT(harmonic, phase);
          const percussiveAudio = processor.reconstructFromSTFT(percussive, phase);

          const ctx = new AudioContext();
          const hBuf = ctx.createBuffer(1, harmonicAudio.length, audioBuffer.sampleRate);
          hBuf.getChannelData(0).set(harmonicAudio);
          const pBuf = ctx.createBuffer(1, percussiveAudio.length, audioBuffer.sampleRate);
          pBuf.getChannelData(0).set(percussiveAudio);

          const melodyVectors = extractMelodyVectors(
            melodyFreqs,
            harmonic,
            audioBuffer.sampleRate,
            512,
            2048
          );

          onSeparated(hBuf, pBuf, melodyFreqs, melodyVectors);
        }

        resolve();
      }, 50);
    });

    setProcessing(false);
  }, [audioBuffer, medianSize, onSeparated]);

  return (
    <div className="flex flex-col gap-3 border border-black/20 p-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          Spectral Separation
          <HelpTooltip
            title="Harmonic-Percussive Separation"
            technical="Filtro mediana horizontal extrae armónicos (notas sostenidas). Filtro mediana vertical extrae percusivos (transientes). Basado en STFT con ventana Hann."
            beginner="Separa la melodía (voces, guitarras) de los golpes (batería, claps). Como filtrar un café: la melodía es el líquido y la percusión son los posos."
          />
        </h4>
        <button
          onClick={handleProcess}
          disabled={!audioBuffer || processing}
          className="text-[10px] uppercase tracking-widest border border-black px-3 py-1 hover:bg-black hover:text-[#f4f4f0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Separate'}
        </button>
      </div>

      {/* Median filter size */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest flex justify-between">
          <span>Median Filter Size</span>
          <span className="font-mono">{medianSize}</span>
        </span>
        <input
          type="range"
          min="3"
          max="31"
          step="2"
          value={medianSize}
          onChange={(e) => setMedianSize(parseInt(e.target.value))}
          className="accent-black"
        />
      </label>

      {/* View mode selector */}
      {result && (
        <>
          <div className="flex gap-1">
            {(['original', 'harmonic', 'percussive', 'inverted'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`flex-1 text-[9px] uppercase tracking-widest py-1 border transition-colors ${
                  viewMode === m
                    ? 'border-black bg-black text-[#f4f4f0]'
                    : 'border-black/20 hover:border-black/40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <SpectrogramView magnitude={result[viewMode]} mode={viewMode} height={150} />
          <div className="text-[10px] font-mono text-black/40">
            {result.melodyFreqs.length} frames · dominant freq range:{' '}
            {Math.round(Math.min(...result.melodyFreqs.filter((f) => f > 20)))}–
            {Math.round(Math.max(...result.melodyFreqs))} Hz
          </div>
        </>
      )}
    </div>
  );
}
