---
name: phase-vocoding
description: Time-stretching extremo mediante phase vocoder sin alterar el pitch. Implementa estiramiento tipo PaulStretch con progresiones basadas en la Sucesión de Padovan y números primos. Use cuando el usuario pida estirar audio, hacer time-stretch, crear texturas ambientales, paulstretch, o manipulación temporal elástica.
---

# Estiramiento Temporal Elástico — Phase Vocoding

## Contexto

Inspirado en PaulStretch (famoso por convertir canciones de 3 minutos en ambientes de 3 horas sin cambiar el tono). Esta skill permite time-stretching extremo basado en números primos y la Sucesión de Padovan.

## Dependencias

El phase vocoder se implementa directamente con Web Audio API y TypeScript. No requiere librerías externas más allá de Tone.js (ya instalado).

## Matemática Fundamental

### Phase Vocoder

El phase vocoder opera en el dominio frecuencial:

1. **Análisis**: STFT con ventana de Hann, `frameSize = 4096`, `hopSize = hopA`
2. **Modificación**: Escalar el hop de síntesis `hopS = hopA × stretchFactor`
3. **Propagación de fase**: Mantener coherencia de fase entre frames

La fase acumulada se calcula como:

\[ \phi_s[k] = \phi_s[k-1] + hopS \cdot \omega_k + hopS \cdot \Delta\phi_{inst}[k] \]

Donde \( \omega_k = 2\pi k / N \) es la frecuencia del bin y \( \Delta\phi_{inst} \) es la desviación instantánea.

### Sucesión de Padovan

Alternativa a Fibonacci con crecimiento más lento (ratio plástico \( p \approx 1.3247 \)):

\[ P(n) = P(n-2) + P(n-3) \]

Con \( P(0) = P(1) = P(2) = 1 \).

```typescript
function padovan(n: number): number {
  if (n <= 2) return 1;
  let a = 1, b = 1, c = 1;
  for (let i = 3; i <= n; i++) {
    const next = a + b;
    a = b;
    b = c;
    c = next;
  }
  return c;
}
```

## Implementación

### 1. Phase Vocoder Core

```typescript
class PhaseVocoder {
  private frameSize: number;
  private hopA: number; // hop de análisis
  private stretchFactor: number;

  constructor(frameSize = 4096, stretchFactor = 8) {
    this.frameSize = frameSize;
    this.hopA = frameSize / 4;
    this.stretchFactor = stretchFactor;
  }

  private hannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  stretch(input: Float32Array, sampleRate: number): Float32Array {
    const hopS = Math.round(this.hopA * this.stretchFactor);
    const numFrames = Math.floor((input.length - this.frameSize) / this.hopA);
    const outputLength = numFrames * hopS + this.frameSize;
    const output = new Float32Array(outputLength);
    const window = this.hannWindow(this.frameSize);

    const prevPhase = new Float32Array(this.frameSize);
    const synthPhase = new Float32Array(this.frameSize);

    for (let f = 0; f < numFrames; f++) {
      const offset = f * this.hopA;
      const frame = new Float32Array(this.frameSize);
      for (let i = 0; i < this.frameSize; i++) {
        frame[i] = (input[offset + i] || 0) * window[i];
      }

      // FFT (usar OfflineAudioContext o implementación propia)
      const { real, imag } = this.fft(frame);
      const magnitude = new Float32Array(this.frameSize);
      const phase = new Float32Array(this.frameSize);

      for (let k = 0; k < this.frameSize; k++) {
        magnitude[k] = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
        phase[k] = Math.atan2(imag[k], real[k]);
      }

      // Propagación de fase
      for (let k = 0; k < this.frameSize; k++) {
        const expectedPhase = 2 * Math.PI * k * this.hopA / this.frameSize;
        let phaseDiff = phase[k] - prevPhase[k] - expectedPhase;
        phaseDiff = phaseDiff - 2 * Math.PI * Math.round(phaseDiff / (2 * Math.PI));
        const instFreq = expectedPhase + phaseDiff;
        synthPhase[k] += instFreq * (hopS / this.hopA);
      }

      // IFFT con fase modificada
      const newReal = new Float32Array(this.frameSize);
      const newImag = new Float32Array(this.frameSize);
      for (let k = 0; k < this.frameSize; k++) {
        newReal[k] = magnitude[k] * Math.cos(synthPhase[k]);
        newImag[k] = magnitude[k] * Math.sin(synthPhase[k]);
      }
      const reconstructed = this.ifft(newReal, newImag);

      // Overlap-add
      const outOffset = f * hopS;
      for (let i = 0; i < this.frameSize; i++) {
        output[outOffset + i] += reconstructed[i] * window[i];
      }

      prevPhase.set(phase);
    }

    return output;
  }

  private fft(data: Float32Array): { real: Float32Array; imag: Float32Array } {
    // Implementar Cooley-Tukey radix-2 o usar OfflineAudioContext
    // Ver reference.md para implementación completa
    throw new Error('Implementar FFT');
  }

  private ifft(real: Float32Array, imag: Float32Array): Float32Array {
    throw new Error('Implementar IFFT');
  }
}
```

### 2. PaulStretch simplificado

PaulStretch es una variante que randomiza la fase en lugar de propagarla, creando texturas etéreas:

```typescript
paulStretch(input: Float32Array, stretchFactor: number): Float32Array {
  const frameSize = 4096;
  const hopA = frameSize / 4;
  const hopS = Math.round(hopA * stretchFactor);
  const window = this.hannWindow(frameSize);
  const numFrames = Math.floor((input.length - frameSize) / hopA);
  const output = new Float32Array(numFrames * hopS + frameSize);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopA;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      frame[i] = (input[offset + i] || 0) * window[i];
    }

    const { real, imag } = this.fft(frame);
    const magnitude = new Float32Array(frameSize);

    for (let k = 0; k < frameSize; k++) {
      magnitude[k] = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
    }

    // Fase aleatoria — clave de PaulStretch
    const randomPhase = new Float32Array(frameSize);
    for (let k = 0; k < frameSize; k++) {
      randomPhase[k] = Math.random() * 2 * Math.PI;
    }

    const newReal = magnitude.map((m, k) => m * Math.cos(randomPhase[k]));
    const newImag = magnitude.map((m, k) => m * Math.sin(randomPhase[k]));
    const reconstructed = this.ifft(
      new Float32Array(newReal), new Float32Array(newImag)
    );

    const outOffset = f * hopS;
    for (let i = 0; i < frameSize; i++) {
      output[outOffset + i] += reconstructed[i] * window[i];
    }
  }

  return output;
}
```

### 3. Estiramiento con Sucesión de Padovan

En lugar de un factor de stretch constante, cada frame usa un hop de síntesis determinado por la Sucesión de Padovan. Esto crea texturas que evolucionan de forma no lineal.

```typescript
padovanStretch(input: Float32Array, sampleRate: number, maxPadovanIndex = 20): Float32Array {
  const frameSize = 4096;
  const hopA = frameSize / 4;
  const window = this.hannWindow(frameSize);
  const numFrames = Math.floor((input.length - frameSize) / hopA);

  // Pre-calcular hops variables según Padovan
  const hops: number[] = [];
  let totalOutput = 0;
  for (let f = 0; f < numFrames; f++) {
    const padIdx = (f % maxPadovanIndex) + 1;
    const hopS = hopA * padovan(padIdx);
    hops.push(hopS);
    totalOutput += hopS;
  }

  const output = new Float32Array(totalOutput + frameSize);
  let outPos = 0;

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopA;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      frame[i] = (input[offset + i] || 0) * window[i];
    }

    // PaulStretch con hop variable
    const { real, imag } = this.fft(frame);
    const magnitude = new Float32Array(frameSize);
    for (let k = 0; k < frameSize; k++) {
      magnitude[k] = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
    }

    const rndPhase = new Float32Array(frameSize);
    for (let k = 0; k < frameSize; k++) {
      rndPhase[k] = Math.random() * 2 * Math.PI;
    }

    const r = magnitude.map((m, k) => m * Math.cos(rndPhase[k]));
    const im = magnitude.map((m, k) => m * Math.sin(rndPhase[k]));
    const recon = this.ifft(new Float32Array(r), new Float32Array(im));

    for (let i = 0; i < frameSize; i++) {
      output[outPos + i] += recon[i] * window[i];
    }
    outPos += hops[f];
  }

  return output;
}
```

### 4. Time-stretching por números primos

Variante donde el factor de stretch solo toma valores primos, generando texturas con periodicidad irregular:

```typescript
function primesUpTo(max: number): number[] {
  const sieve = new Array(max + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= max; i++) {
    if (sieve[i]) for (let j = i * i; j <= max; j += i) sieve[j] = false;
  }
  return sieve.reduce((acc, v, i) => v ? [...acc, i] : acc, [] as number[]);
}
```

## Integración con AudioEngine

```typescript
// Añadir a AudioEngine.ts
async timeStretch(
  audioBuffer: AudioBuffer,
  mode: 'constant' | 'padovan' | 'primes',
  factor = 8
): Promise<AudioBuffer> {
  const pv = new PhaseVocoder(4096, factor);
  const input = audioBuffer.getChannelData(0);
  let stretched: Float32Array;

  switch (mode) {
    case 'padovan':
      stretched = pv.padovanStretch(input, audioBuffer.sampleRate);
      break;
    case 'primes':
      // factor cíclico a través de primos
      stretched = pv.stretch(input, audioBuffer.sampleRate);
      break;
    default:
      stretched = pv.stretch(input, audioBuffer.sampleRate);
  }

  const ctx = Tone.getContext().rawContext as AudioContext;
  const newBuffer = ctx.createBuffer(1, stretched.length, audioBuffer.sampleRate);
  newBuffer.getChannelData(0).set(stretched);
  return newBuffer;
}
```

## Recursos

- Para implementación completa de FFT radix-2, ver [reference.md](reference.md)
