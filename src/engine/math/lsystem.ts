export interface LSystemRule {
  [key: string]: string;
}

export class LSystem {
  constructor(
    private axiom: string,
    private rules: LSystemRule
  ) {}

  generate(iterations: number): string {
    let current = this.axiom;
    for (let i = 0; i < iterations; i++) {
      current = current
        .split('')
        .map((ch) => this.rules[ch] ?? ch)
        .join('');
    }
    return current;
  }
}

export interface DrumHit {
  instrument: 'kick' | 'snare' | 'hihat' | 'perc' | 'rest';
  velocity: number;
}

export interface DrumMapping {
  [char: string]: DrumHit;
}

export const defaultDrumMapping: DrumMapping = {
  A: { instrument: 'kick', velocity: 1.0 },
  B: { instrument: 'hihat', velocity: 0.6 },
  C: { instrument: 'snare', velocity: 0.8 },
  D: { instrument: 'perc', velocity: 0.5 },
  '[': { instrument: 'rest', velocity: 0 },
  ']': { instrument: 'rest', velocity: 0 },
};

export function lSystemToPattern(
  sequence: string,
  mapping: DrumMapping = defaultDrumMapping
): Array<{ instrument: string; velocity: number; step: number }> {
  return sequence.split('').map((ch, i) => {
    const mapped = mapping[ch] || { instrument: 'rest', velocity: 0 };
    return { ...mapped, step: i };
  });
}

export const RhythmPresets = {
  algae: new LSystem('A', { A: 'AB', B: 'A' }),
  tree: new LSystem('A', { A: 'B[A]A', B: 'BB' }),
  koch: new LSystem('A', { A: 'ABBA', B: 'BBB' }),
  cantor: new LSystem('A', { A: 'A[A', '[': '[[[' }),
  thueMorse: new LSystem('A', { A: 'AB', B: 'BA' }),
};

export type LSystemPreset = keyof typeof RhythmPresets;
