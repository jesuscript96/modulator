# Referencia — Phase Vocoding

## FFT Radix-2 (Cooley-Tukey) en TypeScript

Implementación pura sin dependencias externas para usar en el phase vocoder:

```typescript
function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const uReal = real[i + j];
        const uImag = imag[i + j];
        const vReal = real[i + j + halfLen] * curReal - imag[i + j + halfLen] * curImag;
        const vImag = real[i + j + halfLen] * curImag + imag[i + j + halfLen] * curReal;

        real[i + j] = uReal + vReal;
        imag[i + j] = uImag + vImag;
        real[i + j + halfLen] = uReal - vReal;
        imag[i + j + halfLen] = uImag - vImag;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }
}

function ifft(real: Float32Array, imag: Float32Array): Float32Array {
  const n = real.length;
  // Conjugar
  for (let i = 0; i < n; i++) imag[i] = -imag[i];
  // FFT directa
  fft(real, imag);
  // Conjugar y normalizar
  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = real[i] / n;
  }
  return output;
}
```

## Sucesión de Padovan — Primeros 30 valores

| n | P(n) | n | P(n) |
|---|------|---|------|
| 0 | 1 | 15 | 28 |
| 1 | 1 | 16 | 37 |
| 2 | 1 | 17 | 49 |
| 3 | 2 | 18 | 65 |
| 4 | 2 | 19 | 86 |
| 5 | 3 | 20 | 114 |
| 6 | 4 | 21 | 151 |
| 7 | 5 | 22 | 200 |
| 8 | 7 | 23 | 265 |
| 9 | 9 | 24 | 351 |
| 10 | 12 | 25 | 465 |
| 11 | 16 | 26 | 616 |
| 12 | 21 | 27 | 816 |
| 13 | 28 | 28 | 1081 |
| 14 | 37 | 29 | 1432 |

Ratio plástico: \( p = \lim_{n→∞} P(n+1)/P(n) ≈ 1.3247 \)

## Números primos para stretch variable

Primos útiles para factores de stretch (manteniendo periodos no alineados):

```
2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47
```

Usar primos como factores de hop crea patrones que nunca se alinean periódicamente, generando una sensación de "movimiento perpetuo" en la textura resultante.

## Ventanas de análisis

| Ventana | Uso | Lóbulo principal | Atenuación lateral |
|---------|-----|-----------------|-------------------|
| Hann | General (PaulStretch) | Medio | -31 dB |
| Hamming | Análisis espectral | Medio | -43 dB |
| Blackman | Alta resolución | Ancho | -58 dB |
| Rectangular | Máxima resolución temporal | Estrecho | -13 dB |

Para PaulStretch usar siempre **Hann** (mejor reconstrucción overlap-add).

## Procesamiento offline con OfflineAudioContext

Para stretch largos sin bloquear el hilo principal:

```typescript
async function offlineStretch(
  input: AudioBuffer,
  stretchFactor: number
): Promise<AudioBuffer> {
  const outputLength = Math.ceil(input.length * stretchFactor);
  const offline = new OfflineAudioContext(
    input.numberOfChannels,
    outputLength,
    input.sampleRate
  );

  // Procesar en chunks con AudioWorklet
  // ...

  return await offline.startRendering();
}
```

## AudioWorklet para procesamiento en tiempo real

```typescript
// phase-vocoder-processor.ts (AudioWorkletProcessor)
class PhaseVocoderProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input) return true;

    // Aquí va la lógica del phase vocoder frame-a-frame
    // Ver SKILL.md para el algoritmo completo

    return true;
  }
}

registerProcessor('phase-vocoder', PhaseVocoderProcessor);
```
