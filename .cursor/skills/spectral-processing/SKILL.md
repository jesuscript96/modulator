---
name: spectral-processing
description: Procesamiento espectral de audio mediante STFT, separación armónico-percusiva (HPS) e inversión espectral. Usa Essentia.js y Web Audio API. Use cuando el usuario pida esculpir frecuencias, separar melodía de percusión, invertir espectro, analizar armónicos, o trabajar con FFT/STFT.
---

# Esculpir Frecuencias — Spectral Processing

## Contexto

Esta skill permite "desmontar" un archivo de audio en sus componentes frecuenciales, separar armónicos de percusión, extraer melodías como listas de frecuencias y aplicar transformaciones espectrales como la inversión.

## Dependencias

```bash
npm install essentia.js meyda
```

- **Essentia.js**: Librería de análisis de audio del Music Technology Group (MTG). Provee STFT, HPS, pitch detection.
- **Meyda**: Extractor de features de audio en tiempo real (Spectral Flatness, Centroid, etc.).

## Arquitectura

```
MP3 → AudioBuffer → STFT → [Magnitud, Fase]
                              ├─→ Máscara Armónica → Melodía (frecuencias)
                              ├─→ Máscara Percusiva → Transientes
                              └─→ Inversión Espectral → Espejo frecuencial
```

## Implementación

### 1. STFT (Short-Time Fourier Transform)

La STFT descompone la señal en ventanas temporales, aplicando FFT a cada una.

```typescript
import Essentia from 'essentia.js';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.web';

class SpectralProcessor {
  private essentia: Essentia;
  private frameSize = 2048;
  private hopSize = 512;

  async init() {
    const wasmModule = await EssentiaWASM();
    this.essentia = new Essentia(wasmModule);
  }

  computeSTFT(audioData: Float32Array): { magnitude: Float32Array[]; phase: Float32Array[] } {
    const frames: Float32Array[] = [];
    for (let i = 0; i + this.frameSize <= audioData.length; i += this.hopSize) {
      const frame = audioData.slice(i, i + this.frameSize);
      const windowed = this.essentia.Windowing(
        this.essentia.arrayToVector(frame),
        true, this.frameSize, 'hann'
      );
      frames.push(this.essentia.vectorToArray(windowed.frame));
    }

    const magnitude: Float32Array[] = [];
    const phase: Float32Array[] = [];

    for (const frame of frames) {
      const spectrum = this.essentia.Spectrum(
        this.essentia.arrayToVector(frame), this.frameSize
      );
      magnitude.push(this.essentia.vectorToArray(spectrum.spectrum));
      // Fase se extrae del FFT complejo
    }

    return { magnitude, phase };
  }
}
```

**Parámetros clave**:
- `frameSize`: 2048 (resolución frecuencial ~21 Hz a 44100 Hz)
- `hopSize`: 512 (75% overlap → suavidad temporal)
- Ventana: **Hann** — minimiza spectral leakage

### 2. Separación Armónico-Percusiva (HPS)

Basada en mediana filtering sobre el espectrograma:
- **Filtro mediana horizontal** (tiempo) → componente armónico (notas sostenidas)
- **Filtro mediana vertical** (frecuencia) → componente percusivo (transientes)

```typescript
harmonicPercussiveSeparation(
  magnitude: Float32Array[],
  medianFilterSize = 17
): { harmonic: Float32Array[]; percussive: Float32Array[] } {
  const numFrames = magnitude.length;
  const numBins = magnitude[0].length;
  const harmonic: Float32Array[] = [];
  const percussive: Float32Array[] = [];

  // Mediana horizontal → armónicos
  for (let f = 0; f < numFrames; f++) {
    const hFrame = new Float32Array(numBins);
    for (let b = 0; b < numBins; b++) {
      const window: number[] = [];
      const half = Math.floor(medianFilterSize / 2);
      for (let w = -half; w <= half; w++) {
        const idx = Math.max(0, Math.min(numFrames - 1, f + w));
        window.push(magnitude[idx][b]);
      }
      window.sort((a, b) => a - b);
      hFrame[b] = window[Math.floor(window.length / 2)];
    }
    harmonic.push(hFrame);
  }

  // Mediana vertical → percusivos
  for (let f = 0; f < numFrames; f++) {
    const pFrame = new Float32Array(numBins);
    for (let b = 0; b < numBins; b++) {
      const window: number[] = [];
      const half = Math.floor(medianFilterSize / 2);
      for (let w = -half; w <= half; w++) {
        const idx = Math.max(0, Math.min(numBins - 1, b + w));
        window.push(magnitude[f][idx]);
      }
      window.sort((a, b) => a - b);
      pFrame[b] = window[Math.floor(window.length / 2)];
    }
    percussive.push(pFrame);
  }

  return { harmonic, percussive };
}
```

### 3. Extracción de Melodía como Frecuencias

Tras obtener el componente armónico, extraer el pitch dominante por frame:

```typescript
extractMelodyFrequencies(harmonic: Float32Array[], sampleRate = 44100): number[] {
  return harmonic.map(frame => {
    let maxIdx = 0;
    let maxVal = 0;
    for (let i = 1; i < frame.length; i++) {
      if (frame[i] > maxVal) {
        maxVal = frame[i];
        maxIdx = i;
      }
    }
    return (maxIdx * sampleRate) / (frame.length * 2);
  });
}
```

### 4. Inversión Espectral

Espeja las frecuencias alrededor de un eje: lo grave se vuelve agudo y viceversa, manteniendo la relación matemática.

```typescript
spectralInversion(magnitude: Float32Array[]): Float32Array[] {
  return magnitude.map(frame => {
    const inverted = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      inverted[i] = frame[frame.length - 1 - i];
    }
    return inverted;
  });
}
```

Matemáticamente: si \( f \) es la frecuencia original y \( f_{max} \) es la frecuencia Nyquist, la frecuencia invertida es \( f' = f_{max} - f \).

## Integración con AudioEngine

```typescript
// En AudioEngine.ts — añadir método
async processSpectral(audioBuffer: AudioBuffer): Promise<{
  harmonic: AudioBuffer;
  percussive: AudioBuffer;
  melodyFreqs: number[];
}> {
  const processor = new SpectralProcessor();
  await processor.init();
  const data = audioBuffer.getChannelData(0);
  const { magnitude, phase } = processor.computeSTFT(data);
  const { harmonic, percussive } = processor.harmonicPercussiveSeparation(magnitude);
  const melodyFreqs = processor.extractMelodyFrequencies(harmonic, audioBuffer.sampleRate);
  // Reconstruir buffers con ISTFT (overlap-add)
  return { harmonic: /* rebuilt */, percussive: /* rebuilt */, melodyFreqs };
}
```

## Análisis en Tiempo Real con Meyda

```typescript
import Meyda from 'meyda';

// Crear analizador conectado a un nodo de Tone.js
const analyzer = Meyda.createMeydaAnalyzer({
  audioContext: Tone.getContext().rawContext,
  source: grainPlayer, // nodo Web Audio subyacente
  bufferSize: 2048,
  featureExtractors: ['spectralFlatness', 'spectralCentroid', 'mfcc'],
  callback: (features) => {
    // spectralFlatness: 0 = tonal, 1 = ruido
    // Usar como control de distorsión en otra pista
    const distortionAmount = features.spectralFlatness;
  }
});
analyzer.start();
```

## Recursos adicionales

- Para detalles sobre parámetros de Essentia.js, ver [reference.md](reference.md)
