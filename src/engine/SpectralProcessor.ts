import { fft, ifft, hannWindow } from './math/fft';

export interface STFTResult {
  magnitude: Float32Array[];
  phase: Float32Array[];
}

export class SpectralProcessor {
  private frameSize: number;
  private hopSize: number;

  constructor(frameSize = 2048, hopSize = 512) {
    this.frameSize = frameSize;
    this.hopSize = hopSize;
  }

  computeSTFT(audioData: Float32Array): STFTResult {
    const window = hannWindow(this.frameSize);
    const magnitude: Float32Array[] = [];
    const phase: Float32Array[] = [];
    const halfN = this.frameSize / 2 + 1;

    for (let i = 0; i + this.frameSize <= audioData.length; i += this.hopSize) {
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let j = 0; j < this.frameSize; j++) {
        real[j] = audioData[i + j] * window[j];
      }

      const result = fft(real, imag);

      const mag = new Float32Array(halfN);
      const ph = new Float32Array(halfN);
      for (let k = 0; k < halfN; k++) {
        mag[k] = Math.sqrt(result.real[k] ** 2 + result.imag[k] ** 2);
        ph[k] = Math.atan2(result.imag[k], result.real[k]);
      }

      magnitude.push(mag);
      phase.push(ph);
    }

    return { magnitude, phase };
  }

  harmonicPercussiveSeparation(
    magnitude: Float32Array[],
    medianFilterSize = 17
  ): { harmonic: Float32Array[]; percussive: Float32Array[] } {
    const numFrames = magnitude.length;
    if (numFrames === 0) return { harmonic: [], percussive: [] };
    const numBins = magnitude[0].length;
    const half = Math.floor(medianFilterSize / 2);
    const harmonic: Float32Array[] = [];
    const percussive: Float32Array[] = [];

    // Horizontal median → harmonic
    for (let f = 0; f < numFrames; f++) {
      const hFrame = new Float32Array(numBins);
      for (let b = 0; b < numBins; b++) {
        const win: number[] = [];
        for (let w = -half; w <= half; w++) {
          const idx = Math.max(0, Math.min(numFrames - 1, f + w));
          win.push(magnitude[idx][b]);
        }
        win.sort((a, b) => a - b);
        hFrame[b] = win[Math.floor(win.length / 2)];
      }
      harmonic.push(hFrame);
    }

    // Vertical median → percussive
    for (let f = 0; f < numFrames; f++) {
      const pFrame = new Float32Array(numBins);
      for (let b = 0; b < numBins; b++) {
        const win: number[] = [];
        for (let w = -half; w <= half; w++) {
          const idx = Math.max(0, Math.min(numBins - 1, b + w));
          win.push(magnitude[f][idx]);
        }
        win.sort((a, b) => a - b);
        pFrame[b] = win[Math.floor(win.length / 2)];
      }
      percussive.push(pFrame);
    }

    return { harmonic, percussive };
  }

  extractMelodyFrequencies(harmonic: Float32Array[], sampleRate = 44100): number[] {
    return harmonic.map((frame) => {
      let maxIdx = 0;
      let maxVal = 0;
      for (let i = 1; i < frame.length; i++) {
        if (frame[i] > maxVal) {
          maxVal = frame[i];
          maxIdx = i;
        }
      }
      return (maxIdx * sampleRate) / (this.frameSize);
    });
  }

  spectralInversion(magnitude: Float32Array[]): Float32Array[] {
    return magnitude.map((frame) => {
      const inverted = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        inverted[i] = frame[frame.length - 1 - i];
      }
      return inverted;
    });
  }

  reconstructFromSTFT(magnitude: Float32Array[], phase: Float32Array[]): Float32Array {
    const window = hannWindow(this.frameSize);
    const numFrames = magnitude.length;
    const outputLength = (numFrames - 1) * this.hopSize + this.frameSize;
    const output = new Float32Array(outputLength);
    const windowSum = new Float32Array(outputLength);

    for (let f = 0; f < numFrames; f++) {
      const halfN = magnitude[f].length;
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let k = 0; k < halfN; k++) {
        real[k] = magnitude[f][k] * Math.cos(phase[f][k]);
        imag[k] = magnitude[f][k] * Math.sin(phase[f][k]);
      }
      // Mirror for full spectrum
      for (let k = 1; k < halfN - 1; k++) {
        real[this.frameSize - k] = real[k];
        imag[this.frameSize - k] = -imag[k];
      }

      const frame = ifft(real, imag);
      const offset = f * this.hopSize;

      for (let i = 0; i < this.frameSize; i++) {
        output[offset + i] += frame[i] * window[i];
        windowSum[offset + i] += window[i] * window[i];
      }
    }

    // Normalize by window overlap
    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) output[i] /= windowSum[i];
    }

    return output;
  }
}
