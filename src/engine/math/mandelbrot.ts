export function mandelbrotIterations(cx: number, cy: number, maxIter = 50): number {
  let zx = 0,
    zy = 0;
  let iter = 0;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const temp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = temp;
    iter++;
  }
  return iter;
}

export function mandelbrotRhythm(
  steps: number,
  cy: number,
  cxRange: [number, number] = [-2, 0.5],
  maxIter = 50,
  threshold = 25
): boolean[] {
  const pattern: boolean[] = [];
  for (let i = 0; i < steps; i++) {
    const cx = cxRange[0] + (i / steps) * (cxRange[1] - cxRange[0]);
    const iter = mandelbrotIterations(cx, cy, maxIter);
    pattern.push(iter > threshold);
  }
  return pattern;
}

export function mandelbrotDrumKit(steps: number): {
  kick: boolean[];
  snare: boolean[];
  hihat: boolean[];
  perc: boolean[];
} {
  return {
    kick: mandelbrotRhythm(steps, 0.0, [-2, 0.5], 50, 30),
    snare: mandelbrotRhythm(steps, 0.3, [-2, 0.5], 50, 20),
    hihat: mandelbrotRhythm(steps, 0.6, [-2, 0.5], 50, 10),
    perc: mandelbrotRhythm(steps, -0.5, [-2, 0.5], 50, 25),
  };
}

export function boxCountingDimension(pattern: boolean[], maxBoxSize = 16): number {
  const counts: Array<{ size: number; count: number }> = [];
  for (let boxSize = 1; boxSize <= maxBoxSize; boxSize *= 2) {
    let count = 0;
    for (let i = 0; i < pattern.length; i += boxSize) {
      const box = pattern.slice(i, i + boxSize);
      if (box.some((v) => v)) count++;
    }
    counts.push({ size: boxSize, count });
  }
  const n = counts.length;
  if (n < 2) return 1;
  const logSizes = counts.map((c) => Math.log(1 / c.size));
  const logCounts = counts.map((c) => Math.log(Math.max(c.count, 1)));
  const sumX = logSizes.reduce((a, b) => a + b, 0);
  const sumY = logCounts.reduce((a, b) => a + b, 0);
  const sumXY = logSizes.reduce((a, x, i) => a + x * logCounts[i], 0);
  const sumX2 = logSizes.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 1;
  return (n * sumXY - sumX * sumY) / denom;
}
