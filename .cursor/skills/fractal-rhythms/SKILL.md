---
name: fractal-rhythms
description: Generación de ritmos no-euclidianos mediante fractales (Mandelbrot, L-Systems de Lindenmayer) y recursividad. Crea patrones de batería que nunca se repiten exactamente pero mantienen estructura familiar. Usa Tone.js como motor. Use cuando el usuario pida ritmos fractales, patrones recursivos, L-Systems rítmicos, batería generativa, Mandelbrot rítmico, o secuenciación no lineal.
---

# Ritmos No-Euclidianos y Fractales

## Contexto

A diferencia de los ritmos euclidianos (ya implementados en `AudioEngine.ts` con `euclidean(k, n)`), los ritmos fractales usan recursividad para generar patrones que evolucionan a lo largo del tiempo sin repetirse exactamente, pero mantienen auto-similitud a diferentes escalas.

## Dependencias

Usa Tone.js (ya instalado). Opcionalmente:

```bash
npm install @strudel/core  # motor de patrones tipo TidalCycles
```

## 1. L-Systems (Sistemas de Lindenmayer)

### Fundamento

Un L-System es una gramática formal con reglas de reescritura paralela:
- **Axioma**: cadena inicial (ej: `"A"`)
- **Reglas**: sustituciones (ej: `A → AB`, `B → A`)
- **Iteraciones**: aplicar reglas N veces

```typescript
interface LSystemRule {
  [key: string]: string;
}

class LSystem {
  constructor(
    private axiom: string,
    private rules: LSystemRule
  ) {}

  generate(iterations: number): string {
    let current = this.axiom;
    for (let i = 0; i < iterations; i++) {
      current = current
        .split('')
        .map(ch => this.rules[ch] ?? ch)
        .join('');
    }
    return current;
  }
}
```

### Mapeo a Ritmo

Cada carácter de la cadena resultante se interpreta como un evento rítmico:

```typescript
interface DrumMapping {
  [char: string]: {
    instrument: 'kick' | 'snare' | 'hihat' | 'perc' | 'rest';
    velocity: number;
  };
}

const defaultMapping: DrumMapping = {
  'A': { instrument: 'kick', velocity: 1.0 },
  'B': { instrument: 'hihat', velocity: 0.6 },
  'C': { instrument: 'snare', velocity: 0.8 },
  'D': { instrument: 'perc', velocity: 0.5 },
  '[': { instrument: 'rest', velocity: 0 },  // silencio
  ']': { instrument: 'rest', velocity: 0 },
};

function lSystemToPattern(
  sequence: string,
  mapping: DrumMapping
): Array<{ instrument: string; velocity: number; step: number }> {
  return sequence.split('').map((ch, i) => {
    const mapped = mapping[ch] || { instrument: 'rest', velocity: 0 };
    return { ...mapped, step: i };
  });
}
```

### Presets de L-Systems rítmicos

```typescript
const RhythmPresets = {
  // Algae — crecimiento binario básico
  algae: new LSystem('A', { A: 'AB', B: 'A' }),

  // Fractal tree — ramificación con silencios
  tree: new LSystem('A', {
    A: 'B[A]A',
    B: 'BB',
  }),

  // Koch curve — subdivisión rítmica ternaria
  koch: new LSystem('A', {
    A: 'ABBA',
    B: 'BBB',
  }),

  // Cantor set — ritmos con huecos fractales
  cantor: new LSystem('A', {
    A: 'A[A',
    '[': '[[[',
  }),

  // Thue-Morse — ritmo anti-repetitivo perfecto
  thueMorse: new LSystem('A', {
    A: 'AB',
    B: 'BA',
  }),
};
```

## 2. Conjunto de Mandelbrot Rítmico

### Fundamento

Para cada posición \( c \) en el plano complejo, iterar \( z_{n+1} = z_n^2 + c \). El número de iteraciones antes de divergir determina la densidad rítmica.

```typescript
function mandelbrotIterations(
  cx: number, cy: number,
  maxIter = 50
): number {
  let zx = 0, zy = 0;
  let iter = 0;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const temp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = temp;
    iter++;
  }
  return iter;
}
```

### Mapeo a ritmo

Escanear una línea horizontal del conjunto para generar un patrón:

```typescript
function mandelbrotRhythm(
  steps: number,
  cy: number,       // fila del conjunto (-2 a 2)
  cxRange: [number, number] = [-2, 0.5],
  maxIter = 50,
  threshold = 25     // iteraciones > threshold = hit
): boolean[] {
  const pattern: boolean[] = [];
  for (let i = 0; i < steps; i++) {
    const cx = cxRange[0] + (i / steps) * (cxRange[1] - cxRange[0]);
    const iter = mandelbrotIterations(cx, cy, maxIter);
    pattern.push(iter > threshold);
  }
  return pattern;
}
```

### Escáner rítmico multidimensional

Diferentes valores de `cy` generan diferentes instrumentos, creando un kit completo:

```typescript
function mandelbrotDrumKit(steps: number): {
  kick: boolean[];
  snare: boolean[];
  hihat: boolean[];
  perc: boolean[];
} {
  return {
    kick:  mandelbrotRhythm(steps, 0.0,   [-2, 0.5], 50, 30),
    snare: mandelbrotRhythm(steps, 0.3,   [-2, 0.5], 50, 20),
    hihat: mandelbrotRhythm(steps, 0.6,   [-2, 0.5], 50, 10),
    perc:  mandelbrotRhythm(steps, -0.5,  [-2, 0.5], 50, 25),
  };
}
```

## 3. Motor de Secuenciación Fractal

### Integración con AudioEngine

```typescript
type FractalMode = 'lsystem' | 'mandelbrot';

class FractalSequencer {
  private lsystem: LSystem;
  private pattern: Array<{ instrument: string; velocity: number; step: number }> = [];
  private boolPatterns: Record<string, boolean[]> = {};
  private mode: FractalMode = 'lsystem';
  private currentPreset = 'algae';
  private iterations = 4;

  setMode(mode: FractalMode) {
    this.mode = mode;
    this.regenerate();
  }

  setLSystemPreset(name: keyof typeof RhythmPresets, iterations = 4) {
    this.currentPreset = name;
    this.iterations = iterations;
    this.mode = 'lsystem';
    this.regenerate();
  }

  private regenerate() {
    if (this.mode === 'lsystem') {
      const preset = RhythmPresets[this.currentPreset as keyof typeof RhythmPresets];
      const sequence = preset.generate(this.iterations);
      this.pattern = lSystemToPattern(sequence, defaultMapping);
    } else {
      this.boolPatterns = mandelbrotDrumKit(64);
    }
  }

  getPatternForStep(step: number): Array<{
    instrument: 'kick' | 'snare' | 'hihat' | 'perc';
    velocity: number;
  }> {
    if (this.mode === 'mandelbrot') {
      const hits: Array<{ instrument: 'kick'|'snare'|'hihat'|'perc'; velocity: number }> = [];
      const idx = step % 64;
      if (this.boolPatterns.kick?.[idx]) hits.push({ instrument: 'kick', velocity: 1.0 });
      if (this.boolPatterns.snare?.[idx]) hits.push({ instrument: 'snare', velocity: 0.8 });
      if (this.boolPatterns.hihat?.[idx]) hits.push({ instrument: 'hihat', velocity: 0.6 });
      if (this.boolPatterns.perc?.[idx]) hits.push({ instrument: 'perc', velocity: 0.5 });
      return hits;
    }

    // L-System: patrón más largo, ciclar
    const idx = step % Math.max(this.pattern.length, 1);
    const event = this.pattern[idx];
    if (!event || event.instrument === 'rest') return [];
    return [{ instrument: event.instrument as any, velocity: event.velocity }];
  }
}
```

### Modificar el tick() de AudioEngine

```typescript
// En AudioEngine.ts — extender el método tick()
// Añadir propiedad:
fractalSeq: FractalSequencer | null = null;
useFractalRhythm = false;

// En tick(), reemplazar los triggers de drum por:
if (this.useFractalRhythm && this.fractalSeq) {
  const hits = this.fractalSeq.getPatternForStep(this.step);
  for (const hit of hits) {
    switch (hit.instrument) {
      case 'kick':
        this.kick.triggerAttackRelease('C1', '8n', time, hit.velocity);
        break;
      case 'snare':
        this.snare.triggerAttackRelease('16n', time, hit.velocity);
        break;
      case 'hihat':
        this.hihat.triggerAttackRelease('32n', time, hit.velocity * 0.3);
        break;
      case 'perc':
        this.perc.triggerAttackRelease('G3', '16n', time, hit.velocity);
        break;
    }
  }
} else {
  // Patrones euclidianos existentes
  if (this.patterns.kick[currentStep]) this.kick.triggerAttackRelease("C1", "8n", time);
  // ... resto existente
}
```

## 4. Visualización de Fractales Rítmicos

Para visualizar el L-System como árbol en el `CircularSequencer`:

```typescript
function drawLSystemTree(
  ctx: CanvasRenderingContext2D,
  sequence: string,
  startX: number, startY: number,
  length: number, angle: number
) {
  const stack: Array<{ x: number; y: number; a: number }> = [];
  let x = startX, y = startY, a = -Math.PI / 2;

  for (const ch of sequence) {
    switch (ch) {
      case 'A': case 'B':
        const nx = x + Math.cos(a) * length;
        const ny = y + Math.sin(a) * length;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        x = nx; y = ny;
        break;
      case '[':
        stack.push({ x, y, a });
        a -= angle;
        break;
      case ']':
        const state = stack.pop();
        if (state) { x = state.x; y = state.y; a = state.a; }
        a += angle;
        break;
    }
  }
}
```

## Auto-similitud y Estructura

Los ritmos fractales mantienen estas propiedades:
- **Auto-similitud**: El patrón a escala 1:2 se parece al patrón completo
- **Dimensión fractal**: Complejidad entre 1 (lineal) y 2 (aleatorio)
- **No-periodicidad**: Nunca se repiten exactamente, evitando la fatiga rítmica
- **Familiaridad**: Mantienen coherencia estructural reconocible

La dimensión fractal del patrón se puede estimar:

```typescript
function boxCountingDimension(pattern: boolean[], maxBoxSize = 16): number {
  const counts: Array<{ size: number; count: number }> = [];
  for (let boxSize = 1; boxSize <= maxBoxSize; boxSize *= 2) {
    let count = 0;
    for (let i = 0; i < pattern.length; i += boxSize) {
      const box = pattern.slice(i, i + boxSize);
      if (box.some(v => v)) count++;
    }
    counts.push({ size: boxSize, count });
  }
  // Regresión log-log
  const n = counts.length;
  const logSizes = counts.map(c => Math.log(1 / c.size));
  const logCounts = counts.map(c => Math.log(c.count));
  const sumX = logSizes.reduce((a, b) => a + b, 0);
  const sumY = logCounts.reduce((a, b) => a + b, 0);
  const sumXY = logSizes.reduce((a, x, i) => a + x * logCounts[i], 0);
  const sumX2 = logSizes.reduce((a, x) => a + x * x, 0);
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}
```
