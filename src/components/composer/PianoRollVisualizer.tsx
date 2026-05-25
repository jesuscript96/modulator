import React, { useMemo } from 'react';
import type { SoundVector } from '../../types';

interface PianoRollVisualizerProps {
  vectors: SoundVector[];
  height?: number;
}

const FREQ_COLORS = [
  'bg-freq-sub',
  'bg-freq-bass',
  'bg-freq-low-mid',
  'bg-freq-mid',
  'bg-freq-high-mid',
  'bg-freq-high',
];

function colorClassForPitch(p: number): string {
  if (p < 24) return 'bg-[#8B0000]';
  if (p < 48) return 'bg-[#FF6600]';
  if (p < 72) return 'bg-[#FFD700]';
  if (p < 96) return 'bg-[#00AA44]';
  if (p < 112) return 'bg-[#0066CC]';
  return 'bg-[#7700CC]';
}

export default function PianoRollVisualizer({
  vectors,
  height = 200,
}: PianoRollVisualizerProps) {
  const bounds = useMemo(() => {
    if (vectors.length === 0) {
      return { minP: 60, maxP: 72, maxT: 4000 };
    }

    let minP = Infinity;
    let maxP = -Infinity;
    let maxT = 0;

    for (const v of vectors) {
      if (v.p < minP) minP = v.p;
      if (v.p > maxP) maxP = v.p;
      const endT = v.t + v.duration;
      if (endT > maxT) maxT = endT;
    }

    // Give a margin of at least an octave or a couple of semitones
    if (maxP === minP) {
      minP -= 6;
      maxP += 6;
    } else {
      minP = Math.max(0, minP - 2);
      maxP = Math.min(127, maxP + 2);
    }

    // Ensure maxT is at least 1 second
    maxT = Math.max(1000, maxT);

    return { minP, maxP, maxT };
  }, [vectors]);

  const { minP, maxP, maxT } = bounds;
  const pitchRange = maxP - minP + 1;

  // Grid lines
  const horizontalGridLines = useMemo(() => {
    const lines = [];
    for (let p = minP; p <= maxP; p++) {
      if (p % 12 === 0) {
        lines.push({ p, label: `C${Math.floor(p / 12) - 1}`, primary: true });
      } else if (p % 12 === 7) {
        lines.push({ p, label: `G${Math.floor(p / 12) - 1}`, primary: false });
      }
    }
    return lines;
  }, [minP, maxP]);

  return (
    <div
      className="border border-black relative overflow-hidden bg-[#fafafa] flex-grow select-none"
      style={{ height: `${height}px` }}
    >
      {/* Background grid lines */}
      {horizontalGridLines.map((line) => {
        const bottomPct = ((line.p - minP) / pitchRange) * 100;
        return (
          <div
            key={line.p}
            className={`absolute left-0 right-0 border-t ${
              line.primary ? 'border-black/20' : 'border-black/5'
            }`}
            style={{ bottom: `${bottomPct}%` }}
          >
            <span className="absolute left-1 bottom-1 text-[8px] font-mono text-black/30">
              {line.label}
            </span>
          </div>
        );
      })}

      {/* Note rectangles */}
      {vectors.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-black/30 uppercase tracking-wider">
          No notes generated
        </div>
      ) : (
        vectors.map((v, i) => {
          const leftPct = (v.t / maxT) * 100;
          const widthPct = (v.duration / maxT) * 100;
          const bottomPct = ((v.p - minP) / pitchRange) * 100;
          const heightPct = (1 / pitchRange) * 100;

          const colorClass = colorClassForPitch(v.p);

          return (
            <div
              key={v.id || i}
              className={`absolute border border-black/30 opacity-80 ${colorClass}`}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                bottom: `${bottomPct}%`,
                height: `${heightPct}%`,
                minHeight: '2px',
                minWidth: '2px',
              }}
              title={`Pitch: ${v.p}, Time: ${v.t}ms, Dur: ${v.duration}ms`}
            />
          );
        })
      )}
    </div>
  );
}
