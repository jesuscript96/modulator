import { useCallback } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { applyToAll } from '../../engine/math/affine';
import type { AffineMatrix, Clip } from '../../types';
import TimelineView from './TimelineView';
import ClipInspector from './ClipInspector';
import HelpTooltip from '../shared/HelpTooltip';
import helpContent from '../../data/helpContent';
import type { BoardAudioEngine } from '../../engine/BoardAudioEngine';

interface BoardViewProps {
  boardEngine: BoardAudioEngine;
}

export default function BoardView({ boardEngine }: BoardViewProps) {
  const clips = useProjectStore((s) => s.clips);
  const selectedClipId = useProjectStore((s) => s.selectedClipId);
  const currentStep = useProjectStore((s) => s.currentStep);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const bpm = useProjectStore((s) => s.bpm);
  const boardPlaybackMode = useProjectStore((s) => s.boardPlaybackMode);
  const synthType = useProjectStore((s) => s.synthType);
  const selectClip = useProjectStore((s) => s.selectClip);
  const updateClip = useProjectStore((s) => s.updateClip);
  const setBoardPlaybackMode = useProjectStore((s) => s.setBoardPlaybackMode);
  const setSynthType = useProjectStore((s) => s.setSynthType);

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

  const handleClipMove = useCallback(
    (clipId: string, newStartTime: number, newLane: number, deltaSemitones: number) => {
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      const updates: Partial<Clip> = {
        startTime: newStartTime,
        lane: newLane,
      };

      if (clip.vectors.length > 0 && deltaSemitones !== 0) {
        updates.vectors = clip.vectors.map((v) => ({
          ...v,
          p: Math.min(127, Math.max(0, v.p + deltaSemitones)),
        }));
      }

      updateClip(clipId, updates);
    },
    [clips, updateClip]
  );

  const handleSeek = useCallback(
    (beat: number) => {
      const step = Math.max(0, Math.round(beat * 4));
      useProjectStore.setState({ currentStep: step });
      import('tone').then((Tone) => {
        const seconds = step * (60 / bpm / 4);
        Tone.Transport.seconds = seconds;
        if (isPlaying) {
          boardEngine.playActiveClips(seconds);
        }
      });
    },
    [bpm, isPlaying, boardEngine]
  );

  return (
    <div className="flex-grow flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="border-b border-black px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
            Board
            <HelpTooltip {...helpContent.board} />
          </h3>
          <div className="flex items-center gap-1.5 border-l border-black/10 pl-4">
            <span className="text-[9px] uppercase tracking-wider text-black/50">Playback Mode:</span>
            <select
              className="bg-transparent border border-black/20 px-2 py-0.5 font-mono text-[9px] uppercase outline-none focus:border-black cursor-pointer"
              value={boardPlaybackMode}
              onChange={(e) => setBoardPlaybackMode(e.target.value as any)}
            >
              <option value="both">Both (Audio + Synth)</option>
              <option value="synth">Synth Notes Only</option>
              <option value="audio">Audio Wave Only</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 border-l border-black/10 pl-4">
            <span className="text-[9px] uppercase tracking-wider text-black/50">Synth Engine:</span>
            <select
              className="bg-transparent border border-black/20 px-2 py-0.5 font-mono text-[9px] uppercase outline-none focus:border-black cursor-pointer"
              value={synthType}
              onChange={(e) => setSynthType(e.target.value as any)}
            >
              <option value="triangle">Triangle</option>
              <option value="celestial">Celestial Pad</option>
              <option value="violin">Violin</option>
              <option value="guitar">Guitar</option>
            </select>
          </div>
          <span className="text-[10px] font-mono text-black/40 border-l border-black/10 pl-4">
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
            bpm={bpm}
            playheadBeat={playheadBeat}
            selectedClipId={selectedClipId}
            onClipSelect={selectClip}
            onClipMove={handleClipMove}
            onSeek={handleSeek}
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
