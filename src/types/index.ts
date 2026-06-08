export interface SoundVector {
  id: string;
  t: number;
  p: number;
  duration: number;
  velocity: number;
  sourceId: string;
  color?: string;
}

export interface SpectralData {
  magnitude: Float32Array[];
  phase: Float32Array[];
  melodyFreqs?: number[];
}

export type ModulatorType =
  | 'fibonacci'
  | 'golden'
  | 'padovan'
  | 'primes'
  | 'mandelbrot'
  | 'lsystem'
  | 'collatz'
  | 'logistic'
  | 'noise';

export type ModulatorTarget =
  | 'grainSize'
  | 'overlap'
  | 'filterFreq'
  | 'detune'
  | 'pan'
  | 'pitch'
  | 'velocity'
  | 'stretchFactor';

export interface ModulatorConfig {
  type: ModulatorType;
  target: ModulatorTarget;
  complexity: number;
  params: Record<string, number>;
}

export interface Clip {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  vectors: SoundVector[];
  lane: number;
  startTime: number;
  duration: number;
  modulators: ModulatorConfig[];
  spectralData?: SpectralData;
}

export type AffineMatrix = [number, number, number, number, number, number];

export type DrumTrack = 'kick' | 'snare' | 'hihat' | 'perc';

export type MathRule = 'none' | 'fibonacci' | 'golden' | 'noise';

export type RhythmMode = 'euclidean' | 'lsystem' | 'mandelbrot';

export interface EuclideanParams {
  kick: { k: number; n: number };
  snare: { k: number; n: number };
  hihat: { k: number; n: number };
  perc: { k: number; n: number };
}

export interface AudioParams {
  grainSize: number;
  overlap: number;
  filterFreq: number;
  detune: number;
}

export type LabClipType = 'full' | 'harmonic' | 'percussive' | 'inverted' | 'drums';

export interface LabClip {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  type: LabClipType;
  duration: number;
  sampleRate: number;
  createdAt: number;
  vectors?: SoundVector[];
}

export interface ModularJack {
  id: string; // e.g. "module-123-input-cutoff"
  moduleId: string;
  label: string;
  type: 'in' | 'out';
  paramName?: string; // which parameter it modulates / outputs
}

export interface ModularModule {
  id: string;
  type: 'modulator' | 'synth' | 'filter' | 'scope' | 'script';
  name: string;
  x: number;
  y: number;
  params: Record<string, number>;
  inputs: ModularJack[];
  outputs: ModularJack[];
  scriptCode?: string; // For custom scripting module
}

export interface ModularCable {
  id: string;
  fromPortId: string;
  toPortId: string;
  color: string;
}

