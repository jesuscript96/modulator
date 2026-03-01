import { create } from 'zustand';
import type { Clip, LabClip, AffineMatrix } from '../types';

interface ProjectState {
  clips: Clip[];
  labClips: LabClip[];
  bpm: number;
  lanes: number;
  selectedClipId: string | null;
  isPlaying: boolean;
  currentStep: number;
  transform: AffineMatrix | null;

  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  selectClip: (id: string | null) => void;
  addLabClip: (clip: LabClip) => void;
  removeLabClip: (id: string) => void;
  clearLabClips: () => void;
  sendToBoard: (labClipId: string, lane?: number, startTime?: number) => void;
  setBpm: (bpm: number) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentStep: (step: number) => void;
  setTransform: (transform: AffineMatrix | null) => void;
}

function nextAvailableLane(clips: Clip[]): number {
  if (clips.length === 0) return 0;
  const usedLanes = new Set(clips.map((c) => c.lane));
  for (let i = 0; i < 64; i++) {
    if (!usedLanes.has(i)) return i;
  }
  return clips.length;
}

function nextStartTime(clips: Clip[], lane: number): number {
  const laneClips = clips.filter((c) => c.lane === lane);
  if (laneClips.length === 0) return 0;
  return Math.max(...laneClips.map((c) => c.startTime + c.duration));
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  clips: [],
  labClips: [],
  bpm: 120,
  lanes: 8,
  selectedClipId: null,
  isPlaying: false,
  currentStep: 0,
  transform: null,

  addClip: (clip) =>
    set((state) => ({ clips: [...state.clips, clip] })),

  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
    })),

  updateClip: (id, updates) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  selectClip: (id) => set({ selectedClipId: id }),

  addLabClip: (clip) =>
    set((state) => ({ labClips: [...state.labClips, clip] })),

  removeLabClip: (id) =>
    set((state) => ({ labClips: state.labClips.filter((c) => c.id !== id) })),

  clearLabClips: () => set({ labClips: [] }),

  sendToBoard: (labClipId, lane, startTime) => {
    const state = get();
    const labClip = state.labClips.find((c) => c.id === labClipId);
    if (!labClip) return;

    const bpm = state.bpm;
    const durationBeats = (labClip.duration / 60) * bpm;
    const targetLane = lane ?? nextAvailableLane(state.clips);
    const targetStart = startTime ?? nextStartTime(state.clips, targetLane);

    const boardClip: Clip = {
      id: `board-${labClip.id}-${Date.now()}`,
      name: labClip.name,
      audioBuffer: labClip.audioBuffer,
      vectors: [],
      lane: targetLane,
      startTime: targetStart,
      duration: durationBeats,
      modulators: [],
    };

    set((s) => ({ clips: [...s.clips, boardClip] }));
  },

  setBpm: (bpm) => set({ bpm }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setTransform: (transform) => set({ transform }),
}));
