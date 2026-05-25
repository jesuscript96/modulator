import {
  LSystem,
  lSystemToPattern,
  defaultDrumMapping,
  RhythmPresets,
  type LSystemPreset,
  type DrumMapping,
} from './math/lsystem';
import { mandelbrotDrumKit, boxCountingDimension } from './math/mandelbrot';
import { euclidean } from './math/sequences';
import type { RhythmMode, DrumTrack } from '../types';

export interface DrumHitEvent {
  instrument: DrumTrack;
  velocity: number;
}

export class FractalSequencer {
  private mode: RhythmMode = 'euclidean';
  private lsystemPreset: LSystemPreset = 'algae';
  private iterations = 4;
  private customRules: { axiom: string; rules: Record<string, string> } | null = null;
  private mapping: DrumMapping = defaultDrumMapping;

  private lsystemPattern: Array<{ instrument: string; velocity: number; step: number }> = [];
  private mandelbrotPatterns: Record<string, boolean[]> = {};

  private euclideanPatterns: Record<DrumTrack, boolean[]> = {
    kick: euclidean(0, 16),
    snare: euclidean(0, 16),
    hihat: euclidean(0, 16),
    perc: euclidean(0, 16),
  };

  private _fractalDimension = 1;

  get fractalDimension() {
    return this._fractalDimension;
  }

  get currentMode() {
    return this.mode;
  }

  setMode(mode: RhythmMode) {
    this.mode = mode;
    if (mode !== 'euclidean') this.regenerate();
  }

  setLSystemPreset(name: LSystemPreset, iterations = 4) {
    this.lsystemPreset = name;
    this.iterations = iterations;
    this.customRules = null;
    this.mode = 'lsystem';
    this.regenerate();
  }

  setCustomLSystem(axiom: string, rules: Record<string, string>, iterations = 4) {
    this.customRules = { axiom, rules };
    this.iterations = iterations;
    this.mode = 'lsystem';
    this.regenerate();
  }

  setIterations(n: number) {
    this.iterations = Math.max(1, Math.min(8, n));
    this.regenerate();
  }

  setMandelbrotMode() {
    this.mode = 'mandelbrot';
    this.regenerate();
  }

  updateEuclidean(track: DrumTrack, k: number, n: number) {
    this.euclideanPatterns[track] = euclidean(k, n);
  }

  getEuclideanPattern(track: DrumTrack): boolean[] {
    return this.euclideanPatterns[track];
  }

  private regenerate() {
    if (this.mode === 'lsystem') {
      let system: LSystem;
      if (this.customRules) {
        system = new LSystem(this.customRules.axiom, this.customRules.rules);
      } else {
        system = RhythmPresets[this.lsystemPreset];
      }
      const sequence = system.generate(this.iterations);
      this.lsystemPattern = lSystemToPattern(sequence, this.mapping);
      const boolPattern = this.lsystemPattern.map((p) => p.instrument !== 'rest');
      this._fractalDimension = boxCountingDimension(boolPattern);
    } else if (this.mode === 'mandelbrot') {
      const kit = mandelbrotDrumKit(64);
      this.mandelbrotPatterns = kit;
      const combined = kit.kick.map((k, i) => k || kit.snare[i] || kit.hihat[i] || kit.perc[i]);
      this._fractalDimension = boxCountingDimension(combined);
    }
  }

  getPatternForStep(step: number): DrumHitEvent[] {
    if (this.mode === 'euclidean') {
      const s = step % 16;
      const hits: DrumHitEvent[] = [];
      if (this.euclideanPatterns.kick[s]) hits.push({ instrument: 'kick', velocity: 1.0 });
      if (this.euclideanPatterns.snare[(s + 4) % 16]) hits.push({ instrument: 'snare', velocity: 0.8 });
      if (this.euclideanPatterns.hihat[s]) hits.push({ instrument: 'hihat', velocity: 0.6 });
      if (this.euclideanPatterns.perc[s]) hits.push({ instrument: 'perc', velocity: 0.5 });
      return hits;
    }

    if (this.mode === 'mandelbrot') {
      const hits: DrumHitEvent[] = [];
      const idx = step % 64;
      if (this.mandelbrotPatterns.kick?.[idx]) hits.push({ instrument: 'kick', velocity: 1.0 });
      if (this.mandelbrotPatterns.snare?.[idx]) hits.push({ instrument: 'snare', velocity: 0.8 });
      if (this.mandelbrotPatterns.hihat?.[idx]) hits.push({ instrument: 'hihat', velocity: 0.6 });
      if (this.mandelbrotPatterns.perc?.[idx]) hits.push({ instrument: 'perc', velocity: 0.5 });
      return hits;
    }

    // L-System
    const idx = step % Math.max(this.lsystemPattern.length, 1);
    const event = this.lsystemPattern[idx];
    if (!event || event.instrument === 'rest') return [];
    return [{ instrument: event.instrument as DrumTrack, velocity: event.velocity }];
  }

  getLSystemSequence(): string {
    if (this.customRules) {
      const sys = new LSystem(this.customRules.axiom, this.customRules.rules);
      return sys.generate(this.iterations);
    }
    return RhythmPresets[this.lsystemPreset].generate(this.iterations);
  }

  getPatterns16(): Record<DrumTrack, boolean[]> {
    const patterns: Record<DrumTrack, boolean[]> = {
      kick: new Array(16).fill(false),
      snare: new Array(16).fill(false),
      hihat: new Array(16).fill(false),
      perc: new Array(16).fill(false),
    };

    for (let step = 0; step < 16; step++) {
      const hits = this.getPatternForStep(step);
      for (const hit of hits) {
        patterns[hit.instrument][step] = true;
      }
    }
    return patterns;
  }
}
