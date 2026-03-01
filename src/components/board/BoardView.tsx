import { useCallback } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { applyToAll } from '../../engine/math/affine';
import type { AffineMatrix } from '../../types';
import TimelineView from './TimelineView';
import ClipInspector from './ClipInspector';
import HelpTooltip from '../shared/HelpTooltip';
import helpContent from '../../data/helpContent';

export default function BoardView() {
  const clips = useProjectStore((s) => s.clips);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const currentStep = useProjectStore((s) => s.currentStep);
  const bpm = useProjectStore((s) => s.bpm);
  const selectClip = useProjectStore((s) => s.selectClip);
  const updateClip = useProjectStore((s) => s.updateClip);

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;
  const playheadBeat = (currentStep / 4);

  const handleTransform = useCallback(
    (clipId: string, matrix: AffineMatrix) => {
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;
      const newVectors = applyToAll(clip.vectors, matrix);
      updateClip(clipId, { vectors: newVectors });
    },
    [clips, updateClip]
  );

  return (
    <div className="flex-grow flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="border-b border-black px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
            Board
            <HelpTooltip {...helpContent.board} />
          </h3>
          <span className="text-[10px] font-mono text-black/40">
            {clips.length} clip{clips.length !== 1 ? 's' : ''} · {bpm} BPM
          </span>
        </div>
        <div className="text-[10px] font-mono text-black/40">
          scroll = zoom X · shift+scroll = zoom Y · alt+drag = pan
        </div>
      </div>

      {/* Canvas + Inspector */}
      <div className="flex-grow flex min-h-0">
        <div className="flex-grow min-w-0">
          <TimelineView
            clips={clips}
            playheadBeat={playheadBeat}
            selectedClipId={selectedClipId}
            onClipSelect={selectClip}
          />
        </div>

        {selectedClip && (
          <ClipInspector
            clip={selectedClip}
            onClose={() => selectClip(null)}
            onTransform={handleTransform}
          />
        )}
      </div>
    </div>
  );
}
