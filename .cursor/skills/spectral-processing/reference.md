# Referencia — Spectral Processing

## Parámetros de Essentia.js

### Windowing
| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `type` | `'hann'` | Minimiza spectral leakage |
| `size` | 2048 | Resolución frecuencial: `sampleRate/size` ≈ 21.5 Hz |
| `zeroPadding` | 0 | Añadir zeros para interpolar FFT |
| `normalized` | true | Normalizar para conservar energía |

### Spectrum
| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `size` | 2048 | Debe coincidir con frameSize |

### PitchYin / PitchYinFFT
| Parámetro | Rango | Default | Descripción |
|-----------|-------|---------|-------------|
| `frameSize` | 512-8192 | 2048 | Ventana de análisis |
| `sampleRate` | - | 44100 | Frecuencia de muestreo |
| `minFrequency` | 20-2000 | 80 | Frecuencia mínima detectable |
| `maxFrequency` | 100-20000 | 10000 | Frecuencia máxima detectable |

## Features de Meyda

### Spectral Flatness
- Rango: 0 (tonal puro) a 1 (ruido blanco)
- Fórmula: Media geométrica / Media aritmética del espectro de potencia
- Uso: Controlar distorsión, decidir si un segmento es percusivo o tonal

### Spectral Centroid
- Unidad: Hz
- Interpretación: "centro de masa" del espectro, correlaciona con "brillo"
- Uso: Controlar parámetros de filtro

### MFCC (Mel-Frequency Cepstral Coefficients)
- Vector de 13 coeficientes por frame
- Representación compacta del timbre
- Uso: Comparar timbres, clasificar sonidos

### Spectral Rolloff
- Hz donde el 85% de la energía espectral está por debajo
- Uso: Detectar si el sonido tiene muchos agudos

## Implementación de ISTFT (Inverse STFT)

```typescript
function istft(
  magnitude: Float32Array[],
  phase: Float32Array[],
  hopSize: number,
  windowFn: Float32Array
): Float32Array {
  const frameSize = magnitude[0].length * 2;
  const numFrames = magnitude.length;
  const outputLength = (numFrames - 1) * hopSize + frameSize;
  const output = new Float32Array(outputLength);
  const windowSum = new Float32Array(outputLength);

  for (let f = 0; f < numFrames; f++) {
    const real = new Float32Array(frameSize);
    const imag = new Float32Array(frameSize);

    for (let k = 0; k < magnitude[f].length; k++) {
      real[k] = magnitude[f][k] * Math.cos(phase[f][k]);
      imag[k] = magnitude[f][k] * Math.sin(phase[f][k]);
      // Simetría conjugada para señal real
      if (k > 0 && k < magnitude[f].length - 1) {
        real[frameSize - k] = real[k];
        imag[frameSize - k] = -imag[k];
      }
    }

    const frame = ifft(real, imag);
    const offset = f * hopSize;

    for (let i = 0; i < frameSize; i++) {
      output[offset + i] += frame[i] * windowFn[i];
      windowSum[offset + i] += windowFn[i] * windowFn[i];
    }
  }

  // Normalizar por suma de ventanas (overlap-add)
  for (let i = 0; i < outputLength; i++) {
    if (windowSum[i] > 1e-8) {
      output[i] /= windowSum[i];
    }
  }

  return output;
}
```

## Web Audio API: AnalyserNode nativo

Alternativa ligera a Essentia.js para análisis básico en tiempo real:

```typescript
const analyser = Tone.getContext().rawContext.createAnalyser();
analyser.fftSize = 2048;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Float32Array(bufferLength);

function getSpectrum(): Float32Array {
  analyser.getFloatFrequencyData(dataArray);
  return dataArray; // valores en dB
}

function getWaveform(): Float32Array {
  analyser.getFloatTimeDomainData(dataArray);
  return dataArray; // valores -1 a 1
}
```
