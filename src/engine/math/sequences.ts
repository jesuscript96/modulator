export function euclidean(k: number, n: number): boolean[] {
  const seq: boolean[] = new Array(n).fill(false);
  let bucket = 0;
  for (let i = 0; i < n; i++) {
    bucket += k;
    if (bucket >= n) {
      bucket -= n;
      seq[i] = true;
    }
  }
  return seq;
}

export function fibonacci(n: number): number {
  let a = 1,
    b = 1;
  for (let i = 3; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return b;
}

export function padovan(n: number): number {
  if (n <= 2) return 1;
  let a = 1,
    b = 1,
    c = 1;
  for (let i = 3; i <= n; i++) {
    const next = a + b;
    a = b;
    b = c;
    c = next;
  }
  return c;
}

export function collatz(n: number): number[] {
  const seq = [n];
  let current = n;
  while (current !== 1 && seq.length < 1000) {
    current = current % 2 === 0 ? current / 2 : 3 * current + 1;
    seq.push(current);
  }
  return seq;
}

export function logisticMap(x0: number, r: number, steps: number): number[] {
  const values = [x0];
  let x = x0;
  for (let i = 1; i < steps; i++) {
    x = r * x * (1 - x);
    values.push(x);
  }
  return values;
}

export function primesUpTo(max: number): number[] {
  const sieve = new Array(max + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= max; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= max; j += i) sieve[j] = false;
    }
  }
  return sieve.reduce<number[]>((acc, v, i) => (v ? [...acc, i] : acc), []);
}

export function goldenSpiral(n: number): number {
  const PHI = 1.618033988749895;
  return Math.pow(PHI, n);
}

export function getFibonacciSequence(s1: number, s2: number, steps: number): number[] {
  const seq = [s1, s2];
  for (let i = 2; i < steps; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq.slice(0, steps);
}

export function noise1D(x: number): number {
  return Math.sin(x) * Math.sin(x * 2.1) * Math.sin(x * 3.72);
}

const PHI = 1.618033988749895;

export function applyMuteRule(
  pattern: boolean[],
  rule: 'none' | 'golden' | 'fibonacci' | 'goldenNoise',
): boolean[] {
  if (rule === 'none') return pattern;

  const result = [...pattern];
  const n = pattern.length;

  if (rule === 'golden') {
    for (let i = 0; i < n; i++) {
      if (result[i]) {
        const frac = (i * PHI) % 1;
        if (frac > 0.618) result[i] = false;
      }
    }
  } else if (rule === 'fibonacci') {
    const fibSet = new Set<number>();
    let a = 0, b = 1;
    while (a < n) {
      fibSet.add(a);
      const c = a + b;
      a = b;
      b = c;
    }
    for (let i = 0; i < n; i++) {
      if (result[i] && !fibSet.has(i)) result[i] = false;
    }
  } else if (rule === 'goldenNoise') {
    for (let i = 0; i < n; i++) {
      if (result[i]) {
        const v = Math.abs(Math.sin(i * PHI * 12.9898 + 0.37));
        if (v < 0.382) result[i] = false;
      }
    }
  }

  return result;
}
