import { create } from 'zustand';

export type DrumTrackKey = 'bd' | 'sd' | 'ch' | 'oh' | 'cp' | 'cb';

export interface DrumsState {
  patterns: Record<DrumTrackKey, boolean[]>;
  synthParams: {
    bd: { pitch: number; decay: number; click: number; drive: number };
    sd: { tone: number; decay: number; snappy: number; cutoff: number };
    ch: { decay: number; tone: number };
    oh: { decay: number; tone: number };
    cp: { decay: number; filter: number; density: number };
    cb: { pitch: number; decay: number };
  };
  lfoParams: {
    type: number; // 0: Fibonacci, 1: Golden Ratio, 2: Padovan, 3: Primes, 4: Collatz, 5: Logistic, 6: Noise
    complexity: number;
    attenuation: number;
  };
  modulations: Record<string, { source: 'none' | 'lfo'; depth: number }>;
  mixerParams: Record<string, number>; // vol_bd, pan_bd, mute_bd, etc.
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  
  // Actions
  toggleStep: (track: DrumTrackKey, stepIdx: number) => void;
  updateSynthParam: (track: DrumTrackKey, param: string, value: number) => void;
  updateLfoParam: (param: string, value: number) => void;
  updateModulation: (target: string, source: 'none' | 'lfo', depth: number) => void;
  updateMixerParam: (param: string, value: number) => void;
  setBpm: (bpm: number) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentStep: (step: number) => void;
  
  clearTrack: (track: DrumTrackKey) => void;
  clearAll: () => void;
  generateMathPattern: (track: DrumTrackKey, algorithm: string, params: Record<string, number>) => void;
  loadPreset: (preset: 'basic' | 'euclidean' | 'fibonacci' | 'chaos') => void;
}

const initialPatterns = (): Record<DrumTrackKey, boolean[]> => ({
  bd: Array(16).fill(false),
  sd: Array(16).fill(false),
  ch: Array(16).fill(false),
  oh: Array(16).fill(false),
  cp: Array(16).fill(false),
  cb: Array(16).fill(false),
});

const initialMixerParams = (): Record<string, number> => ({
  vol_bd: -4, pan_bd: -0.1, mute_bd: 0,
  vol_sd: -6, pan_sd: 0.1, mute_sd: 0,
  vol_ch: -8, pan_ch: -0.3, mute_ch: 0,
  vol_oh: -8, pan_oh: 0.3, mute_oh: 0,
  vol_cp: -10, pan_cp: -0.2, mute_cp: 0,
  vol_cb: -12, pan_cb: 0.2, mute_cb: 0,
});

export const useDrumsStore = create<DrumsState>((set) => ({
  patterns: {
    ...initialPatterns(),
    // pre-populate basic beat
    bd: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    sd: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    ch: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  },
  synthParams: {
    bd: { pitch: 52, decay: 0.35, click: 0.7, drive: 0.2 },
    sd: { tone: 180, decay: 0.2, snappy: 0.5, cutoff: 1800 },
    ch: { decay: 0.08, tone: 8000 },
    oh: { decay: 0.35, tone: 8000 },
    cp: { decay: 0.25, filter: 1500, density: 4 },
    cb: { pitch: 68, decay: 0.25 },
  },
  lfoParams: {
    type: 0, // Fibonacci
    complexity: 8,
    attenuation: 0.8,
  },
  modulations: {
    'bd_pitch': { source: 'none', depth: 0.5 },
    'sd_decay': { source: 'none', depth: 0.5 },
    'ch_decay': { source: 'none', depth: 0.5 },
    'oh_tone': { source: 'none', depth: 0.5 },
    'cp_filter': { source: 'none', depth: 0.5 },
    'cb_decay': { source: 'none', depth: 0.5 },
  },
  mixerParams: initialMixerParams(),
  bpm: 120,
  isPlaying: false,
  currentStep: 0,

  toggleStep: (track, stepIdx) =>
    set((state) => ({
      patterns: {
        ...state.patterns,
        [track]: state.patterns[track].map((val, idx) => (idx === stepIdx ? !val : val)),
      },
    })),

  updateSynthParam: (track, param, value) =>
    set((state) => ({
      synthParams: {
        ...state.synthParams,
        [track]: {
          ...state.synthParams[track],
          [param]: value,
        },
      },
    })),

  updateLfoParam: (param, value) =>
    set((state) => ({
      lfoParams: {
        ...state.lfoParams,
        [param]: value,
      },
    })),

  updateModulation: (target, source, depth) =>
    set((state) => ({
      modulations: {
        ...state.modulations,
        [target]: { source, depth },
      },
    })),

  updateMixerParam: (param, value) =>
    set((state) => ({
      mixerParams: {
        ...state.mixerParams,
        [param]: value,
      },
    })),

  setBpm: (bpm) => set({ bpm }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  clearTrack: (track) =>
    set((state) => ({
      patterns: {
        ...state.patterns,
        [track]: Array(16).fill(false),
      },
    })),

  clearAll: () =>
    set(() => ({
      patterns: initialPatterns(),
    })),

  generateMathPattern: (track, algorithm, params) =>
    set((state) => {
      const newPattern = Array(16).fill(false);
      
      if (algorithm === 'euclidean') {
        const k = params.k ?? 4;
        const n = params.n ?? 16;
        const rot = params.rot ?? 0;
        
        if (k > 0) {
          for (let i = 0; i < n; i++) {
            const idx = (i - rot + n) % n;
            const current = Math.floor((i * k) / n);
            const next = Math.floor(((i + 1) * k) / n);
            if (current !== next) {
              if (idx < 16) newPattern[idx] = true;
            }
          }
        }
      } 
      
      else if (algorithm === 'fibonacci') {
        // Triggers placed at Fibonacci intervals
        const fibTimes = [1, 2, 3, 5, 8, 13];
        fibTimes.forEach((val) => {
          const idx = (val - 1) % 16;
          newPattern[idx] = true;
        });
      } 
      
      else if (algorithm === 'primes') {
        // Triggers at prime step indices: 2, 3, 5, 7, 11, 13
        const primeIndices = [2, 3, 5, 7, 11, 13];
        primeIndices.forEach((val) => {
          newPattern[val % 16] = true;
        });
      } 
      
      else if (algorithm === 'logistic') {
        // Chaotic logistic map threshold triggers
        let x = params.seed ?? 0.5;
        const r = 3.9; // chaotic
        for (let i = 0; i < 16; i++) {
          x = r * x * (1 - x);
          if (x > (params.threshold ?? 0.5)) {
            newPattern[i] = true;
          }
        }
      }
      
      else if (algorithm === 'padovan') {
        const padVals = [1, 1, 1, 2, 2, 3, 4, 5, 7, 9, 12];
        padVals.forEach((val) => {
          newPattern[val % 16] = true;
        });
      }

      return {
        patterns: {
          ...state.patterns,
          [track]: newPattern,
        },
      };
    }),

  loadPreset: (preset) =>
    set((state) => {
      const pats = initialPatterns();
      
      if (preset === 'basic') {
        pats.bd = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
        pats.sd = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
        pats.ch = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
      } 
      
      else if (preset === 'euclidean') {
        // Euclidean E(5,16) BD, E(3,16) SD, E(11,16) CH, E(2,16) OH
        // Helper to distribute E(k,n)
        const getEucl = (k: number, n: number, rot: number = 0) => {
          const arr = Array(n).fill(false);
          for (let i = 0; i < n; i++) {
            const idx = (i - rot + n) % n;
            const current = Math.floor((i * k) / n);
            const next = Math.floor(((i + 1) * k) / n);
            if (current !== next) {
              arr[idx] = true;
            }
          }
          return arr.slice(0, 16);
        };
        pats.bd = getEucl(5, 16);
        pats.sd = getEucl(3, 16, 4);
        pats.ch = getEucl(9, 16);
        pats.oh = getEucl(2, 16, 2);
        pats.cb = getEucl(3, 16, 6);
      } 
      
      else if (preset === 'fibonacci') {
        // Fibonacci based triggers
        const getFib = (offset: number) => {
          const arr = Array(16).fill(false);
          const fib = [1, 1, 2, 3, 5, 8, 13];
          fib.forEach((f) => {
            arr[(f - 1 + offset) % 16] = true;
          });
          return arr;
        };
        pats.bd = getFib(0);
        pats.sd = getFib(4);
        pats.ch = getFib(2);
        pats.oh = getFib(6);
        pats.cp = getFib(8);
      } 
      
      else if (preset === 'chaos') {
        // Logistic chaos triggers
        const getChaos = (seed: number, thresh: number) => {
          const arr = Array(16).fill(false);
          let x = seed;
          const r = 3.95;
          for (let i = 0; i < 16; i++) {
            x = r * x * (1 - x);
            if (x > thresh) arr[i] = true;
          }
          return arr;
        };
        pats.bd = getChaos(0.2, 0.45);
        pats.sd = getChaos(0.35, 0.55);
        pats.ch = getChaos(0.5, 0.35);
        pats.oh = getChaos(0.65, 0.6);
        pats.cp = getChaos(0.8, 0.7);
      }

      return {
        patterns: pats,
      };
    }),
}));
