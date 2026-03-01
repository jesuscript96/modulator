import type { SoundVector, AffineMatrix } from '../../types';

/**
 * Apply a 2D affine transform to a sound vector.
 * Matrix layout: [a, b, c, d, tx, ty] representing:
 *   | a  b  tx |   | t |
 *   | c  d  ty | × | p |
 *   | 0  0   1 |   | 1 |
 */
export function applyAffine(v: SoundVector, m: AffineMatrix): SoundVector {
  const [a, b, c, d, tx, ty] = m;
  return {
    ...v,
    t: a * v.t + b * v.p + tx,
    p: c * v.t + d * v.p + ty,
  };
}

export function applyToAll(nodes: SoundVector[], m: AffineMatrix): SoundVector[] {
  return nodes.map((v) => applyAffine(v, m));
}

export const Transforms = {
  timeScale: (factor: number): AffineMatrix => [factor, 0, 0, 1, 0, 0],

  pitchScale: (factor: number): AffineMatrix => [1, 0, 0, factor, 0, 0],

  translate: (dt: number, dp: number): AffineMatrix => [1, 0, 0, 1, dt, dp],

  rotate: (angleDeg: number): AffineMatrix => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [cos, -sin, sin, cos, 0, 0];
  },

  retrograde: (maxT: number): AffineMatrix => [-1, 0, 0, 1, maxT, 0],

  inversion: (axisPitch: number): AffineMatrix => [1, 0, 0, -1, 0, 2 * axisPitch],

  compose: (a: AffineMatrix, b: AffineMatrix): AffineMatrix => {
    const [a0, a1, a2, a3, a4, a5] = a;
    const [b0, b1, b2, b3, b4, b5] = b;
    return [
      a0 * b0 + a1 * b2,
      a0 * b1 + a1 * b3,
      a2 * b0 + a3 * b2,
      a2 * b1 + a3 * b3,
      a0 * b4 + a1 * b5 + a4,
      a2 * b4 + a3 * b5 + a5,
    ];
  },

  identity: (): AffineMatrix => [1, 0, 0, 1, 0, 0],
};
