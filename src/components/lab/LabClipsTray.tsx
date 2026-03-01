import { useProjectStore } from '../../stores/useProjectStore';
import { Trash2, ArrowRight, Music, Drum, Waves, RotateCcw } from 'lucide-react';
import type { LabClipType } from '../../types';

const TYPE_ICON: Record<LabClipType, typeof Music> = {
  full: Music,
  harmonic: Waves,
  percussive: Drum,
  inverted: RotateCcw,
  drums: Drum,
};

const TYPE_LABEL: Record<LabClipType, string> = {
  full: 'Full',
  harmonic: 'Harmonic',
  percussive: 'Percussive',
  inverted: 'Inverted',
  drums: 'Drums',
};

export default function LabClipsTray() {
  const labClips = useProjectStore((s) => s.labClips);
  const removeLabClip = useProjectStore((s) => s.removeLabClip);
  const sendToBoard = useProjectStore((s) => s.sendToBoard);
  const clearLabClips = useProjectStore((s) => s.clearLabClips);

  if (labClips.length === 0) return null;

  return (
    <div className="border-t border-black pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-[10px] uppercase tracking-widest">
          Lab Clips ({labClips.length})
        </h4>
        <div className="flex gap-1">
          <button
            onClick={() => {
              labClips.forEach((c) => sendToBoard(c.id));
            }}
            className="text-[9px] uppercase tracking-widest border border-black px-2 py-0.5 hover:bg-black hover:text-[#f4f4f0] transition-colors"
          >
            Send All to Board
          </button>
          <button
            onClick={clearLabClips}
            className="text-[9px] uppercase tracking-widest border border-black/30 px-2 py-0.5 hover:border-black hover:bg-black hover:text-[#f4f4f0] transition-colors text-black/50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {labClips.map((clip) => {
          const Icon = TYPE_ICON[clip.type];
          return (
            <div
              key={clip.id}
              className="border border-black/20 p-2.5 flex flex-col gap-2 hover:border-black/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 shrink-0 text-black/50" />
                <span className="font-mono text-[10px] font-bold truncate flex-1">
                  {clip.name}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-black/40 border border-black/10 px-1.5 py-0.5">
                  {TYPE_LABEL[clip.type]}
                </span>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-black/40">
                <span>{clip.duration.toFixed(1)}s</span>
                <span>{clip.sampleRate} Hz</span>
              </div>

              {/* Mini waveform preview */}
              <MiniWaveform audioBuffer={clip.audioBuffer} />

              <div className="flex gap-1">
                <button
                  onClick={() => sendToBoard(clip.id)}
                  className="flex-1 text-[9px] uppercase tracking-widest border border-black px-2 py-1 hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  Board
                </button>
                <button
                  onClick={() => removeLabClip(clip.id)}
                  className="text-[9px] border border-black/20 px-2 py-1 hover:border-red-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniWaveform({ audioBuffer }: { audioBuffer: AudioBuffer }) {
  const data = audioBuffer.getChannelData(0);
  const samples = 60;
  const blockSize = Math.floor(data.length / samples);
  const bars: number[] = [];
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    const start = blockSize * i;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(data[start + j]);
    }
    bars.push(sum / blockSize);
  }
  const max = Math.max(...bars, 0.001);

  return (
    <div className="h-6 flex items-end gap-[1px]">
      {bars.map((v, i) => (
        <div
          key={i}
          className="bg-black/30 flex-1 min-w-0"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}
