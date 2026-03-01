import React, { useRef, useEffect } from 'react';
import HelpTooltip from '../shared/HelpTooltip';

interface SpectrogramViewProps {
  magnitude: Float32Array[];
  sampleRate?: number;
  height?: number;
  mode?: 'original' | 'harmonic' | 'percussive' | 'inverted';
}

const HEAT_COLORS = [
  [17, 17, 17],       // silence = dark
  [139, 0, 0],        // low = dark red
  [255, 102, 0],      // mid-low = orange
  [255, 215, 0],      // mid = yellow
  [0, 170, 68],       // mid-high = green
  [0, 102, 204],      // high = blue
  [244, 244, 240],    // max = bright
];

function interpolateColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (HEAT_COLORS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, HEAT_COLORS.length - 1);
  const frac = idx - lo;
  return [
    Math.round(HEAT_COLORS[lo][0] + (HEAT_COLORS[hi][0] - HEAT_COLORS[lo][0]) * frac),
    Math.round(HEAT_COLORS[lo][1] + (HEAT_COLORS[hi][1] - HEAT_COLORS[lo][1]) * frac),
    Math.round(HEAT_COLORS[lo][2] + (HEAT_COLORS[hi][2] - HEAT_COLORS[lo][2]) * frac),
  ];
}

export default function SpectrogramView({
  magnitude,
  sampleRate = 44100,
  height = 200,
  mode = 'original',
}: SpectrogramViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || magnitude.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numFrames = magnitude.length;
    const numBins = magnitude[0].length;
    const W = canvas.width;
    const H = canvas.height;

    // Find global max for normalization
    let globalMax = 0;
    for (const frame of magnitude) {
      for (let i = 0; i < frame.length; i++) {
        if (frame[i] > globalMax) globalMax = frame[i];
      }
    }
    if (globalMax === 0) globalMax = 1;

    const imgData = ctx.createImageData(W, H);

    for (let px = 0; px < W; px++) {
      const frameIdx = Math.floor((px / W) * numFrames);
      const frame = magnitude[Math.min(frameIdx, numFrames - 1)];

      for (let py = 0; py < H; py++) {
        // Log frequency scale
        const normalizedY = 1 - py / H;
        const binIdx = Math.floor(Math.pow(normalizedY, 2) * (numBins - 1));
        const val = frame[Math.min(binIdx, numBins - 1)] / globalMax;

        const [r, g, b] = interpolateColor(Math.pow(val, 0.4));
        const idx = (py * W + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Frequency labels
    ctx.fillStyle = '#f4f4f0';
    ctx.font = '9px monospace';
    const freqs = [100, 500, 1000, 5000, 10000];
    for (const f of freqs) {
      const bin = Math.floor((f / (sampleRate / 2)) * numBins);
      const normY = bin / numBins;
      const py = H - Math.sqrt(normY) * H;
      if (py > 10 && py < H - 10) {
        ctx.fillText(`${f >= 1000 ? `${f / 1000}k` : f}Hz`, 3, py);
      }
    }
  }, [magnitude, sampleRate, height, mode]);

  if (magnitude.length === 0) {
    return (
      <div
        className="border border-black/20 flex items-center justify-center text-xs text-black/30 uppercase tracking-widest"
        style={{ height }}
      >
        No spectral data
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="absolute top-1 right-1 z-10">
        <HelpTooltip
          title="Spectrogram"
          technical="Representación tiempo-frecuencia via STFT (frameSize=2048, hop=512, ventana Hann). Escala de frecuencia logarítmica. Intensidad = magnitud normalizada."
          beginner="Un mapa de calor del sonido: horizontal = tiempo, vertical = frecuencia (agudo arriba, grave abajo). Colores brillantes = más energía en esa frecuencia."
        />
      </span>
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full border border-black/20"
        style={{ imageRendering: 'auto' }}
      />
      <div className="flex justify-between text-[9px] font-mono text-black/40 mt-0.5 px-1">
        <span>0s</span>
        <span className="uppercase">{mode}</span>
        <span>→ t</span>
      </div>
    </div>
  );
}
