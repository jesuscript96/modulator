import { useRef, useEffect, useState, useCallback } from 'react';
import { TimelineCanvas } from '../../canvas/TimelineCanvas';
import type { Clip } from '../../types';

interface TimelineViewProps {
  clips: Clip[];
  bpm: number;
  playheadBeat: number;
  selectedClipId: string | null;
  onClipSelect: (id: string | null) => void;
  onClipMove?: (clipId: string, newStartTime: number, newLane: number, deltaSemitones: number) => void;
  onSeek?: (beat: number) => void;
}

export default function TimelineView({
  clips,
  bpm,
  playheadBeat,
  selectedClipId,
  onClipSelect,
  onClipMove,
  onSeek,
}: TimelineViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TimelineCanvas | null>(null);
  const initStarted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Guard: only one init ever runs (survives StrictMode double-mount)
    if (initStarted.current) {
      if (engineRef.current) setReady(true);
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    initStarted.current = true;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width || 800;
    canvas.height = rect.height || 400;

    const engine = new TimelineCanvas();

    engine.init(canvas).then(() => {
      engineRef.current = engine;
      setReady(true);
    }).catch(() => {
      initStarted.current = false;
    });
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.onClipSelect = onClipSelect;
      engineRef.current.onClipMove = onClipMove;
      engineRef.current.onSeek = onSeek;
    }
  }, [onClipSelect, onClipMove, onSeek, ready]);

  useEffect(() => {
    if (ready && engineRef.current) {
      engineRef.current.setBpm(bpm);
    }
  }, [bpm, ready]);

  useEffect(() => {
    if (ready && engineRef.current) {
      engineRef.current.setClips(clips);
    }
  }, [clips, ready]);

  useEffect(() => {
    if (ready && engineRef.current) {
      engineRef.current.setPlayhead(playheadBeat);
    }
  }, [playheadBeat, ready]);

  useEffect(() => {
    if (ready && engineRef.current) {
      engineRef.current.setSelectedClip(selectedClipId);
    }
  }, [selectedClipId, ready]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && engineRef.current) {
          engineRef.current.resize(width, height);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: '300px' }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
