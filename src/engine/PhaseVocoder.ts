import { fft, ifft, hannWindow } from './math/fft';
import { padovan, primesUpTo } from './math/sequences';

export type StretchMode = 'constant' | 'padovan' | 'primes' | 'paulstretch';

export class PhaseVocoder {
  private frameSize: number;
  private hopA: number;
  private stretchFactor: number;

  constructor(frameSize = 4096, stretchFactor = 8) {
    this.frameSize = frameSize;
    this.hopA = frameSize / 4;
    this.stretchFactor = stretchFactor;
  }

  stretch(input: Float32Array, _sampleRate: number): Float32Array {
    const hopS = Math.round(this.hopA * this.stretchFactor);
    const numFrames = Math.floor((input.length - this.frameSize) / this.hopA);
    if (numFrames <= 0) return new Float32Array(input);

    const outputLength = numFrames * hopS + this.frameSize;
    const output = new Float32Array(outputLength);
    const windowSum = new Float32Array(outputLength);
    const window = hannWindow(this.frameSize);

    const prevPhase = new Float32Array(this.frameSize);
    const synthPhase = new Float32Array(this.frameSize);

    for (let f = 0; f < numFrames; f++) {
      const offset = f * this.hopA;
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let i = 0; i < this.frameSize; i++) {
        real[i] = (input[offset + i] || 0) * window[i];
      }

      const result = fft(real, imag);
      const magnitude = new Float32Array(this.frameSize);
      const phase = new Float32Array(this.frameSize);

      for (let k = 0; k < this.frameSize; k++) {
        magnitude[k] = Math.sqrt(result.real[k] ** 2 + result.imag[k] ** 2);
        phase[k] = Math.atan2(result.imag[k], result.real[k]);
      }

      for (let k = 0; k < this.frameSize; k++) {
        const expectedPhase = (2 * Math.PI * k * this.hopA) / this.frameSize;
        let phaseDiff = phase[k] - prevPhase[k] - expectedPhase;
        phaseDiff -= 2 * Math.PI * Math.round(phaseDiff / (2 * Math.PI));
        const instFreq = expectedPhase + phaseDiff;
        synthPhase[k] += instFreq * (hopS / this.hopA);
      }

      const newReal = new Float32Array(this.frameSize);
      const newImag = new Float32Array(this.frameSize);
      for (let k = 0; k < this.frameSize; k++) {
        newReal[k] = magnitude[k] * Math.cos(synthPhase[k]);
        newImag[k] = magnitude[k] * Math.sin(synthPhase[k]);
      }
      const reconstructed = ifft(newReal, newImag);

      const outOffset = f * hopS;
      for (let i = 0; i < this.frameSize; i++) {
        if (outOffset + i < outputLength) {
          output[outOffset + i] += reconstructed[i] * window[i];
          windowSum[outOffset + i] += window[i] * window[i];
        }
      }

      prevPhase.set(phase);
    }

    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) output[i] /= windowSum[i];
    }

    return output;
  }

  paulStretch(input: Float32Array, stretchFactor: number): Float32Array {
    const hopS = Math.round(this.hopA * stretchFactor);
    const numFrames = Math.floor((input.length - this.frameSize) / this.hopA);
    if (numFrames <= 0) return new Float32Array(input);

    const outputLength = numFrames * hopS + this.frameSize;
    const output = new Float32Array(outputLength);
    const windowSum = new Float32Array(outputLength);
    const window = hannWindow(this.frameSize);

    for (let f = 0; f < numFrames; f++) {
      const offset = f * this.hopA;
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let i = 0; i < this.frameSize; i++) {
        real[i] = (input[offset + i] || 0) * window[i];
      }

      const result = fft(real, imag);
      const magnitude = new Float32Array(this.frameSize);

      for (let k = 0; k < this.frameSize; k++) {
        magnitude[k] = Math.sqrt(result.real[k] ** 2 + result.imag[k] ** 2);
      }

      const newReal = new Float32Array(this.frameSize);
      const newImag = new Float32Array(this.frameSize);
      for (let k = 0; k < this.frameSize; k++) {
        const randomPhase = Math.random() * 2 * Math.PI;
        newReal[k] = magnitude[k] * Math.cos(randomPhase);
        newImag[k] = magnitude[k] * Math.sin(randomPhase);
      }
      const reconstructed = ifft(newReal, newImag);

      const outOffset = f * hopS;
      for (let i = 0; i < this.frameSize; i++) {
        if (outOffset + i < outputLength) {
          output[outOffset + i] += reconstructed[i] * window[i];
          windowSum[outOffset + i] += window[i] * window[i];
        }
      }
    }

    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) output[i] /= windowSum[i];
    }

    return output;
  }

  padovanStretch(input: Float32Array, _sampleRate: number, maxPadovanIndex = 15): Float32Array {
    const numFrames = Math.floor((input.length - this.frameSize) / this.hopA);
    if (numFrames <= 0) return new Float32Array(input);

    const window = hannWindow(this.frameSize);
    const hops: number[] = [];
    let totalOutput = 0;

    for (let f = 0; f < numFrames; f++) {
      const padIdx = (f % maxPadovanIndex) + 1;
      const hopS = this.hopA * Math.min(padovan(padIdx), 50);
      hops.push(hopS);
      totalOutput += hopS;
    }

    const output = new Float32Array(totalOutput + this.frameSize);
    const windowSum = new Float32Array(totalOutput + this.frameSize);
    let outPos = 0;

    for (let f = 0; f < numFrames; f++) {
      const offset = f * this.hopA;
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let i = 0; i < this.frameSize; i++) {
        real[i] = (input[offset + i] || 0) * window[i];
      }

      const result = fft(real, imag);
      const magnitude = new Float32Array(this.frameSize);

      for (let k = 0; k < this.frameSize; k++) {
        magnitude[k] = Math.sqrt(result.real[k] ** 2 + result.imag[k] ** 2);
      }

      const newReal = new Float32Array(this.frameSize);
      const newImag = new Float32Array(this.frameSize);
      for (let k = 0; k < this.frameSize; k++) {
        const rndPhase = Math.random() * 2 * Math.PI;
        newReal[k] = magnitude[k] * Math.cos(rndPhase);
        newImag[k] = magnitude[k] * Math.sin(rndPhase);
      }
      const recon = ifft(newReal, newImag);

      for (let i = 0; i < this.frameSize; i++) {
        if (outPos + i < output.length) {
          output[outPos + i] += recon[i] * window[i];
          windowSum[outPos + i] += window[i] * window[i];
        }
      }
      outPos += hops[f];
    }

    for (let i = 0; i < output.length; i++) {
      if (windowSum[i] > 1e-8) output[i] /= windowSum[i];
    }

    return output;
  }

  primeStretch(input: Float32Array, _sampleRate: number): Float32Array {
    const primes = primesUpTo(50);
    const numFrames = Math.floor((input.length - this.frameSize) / this.hopA);
    if (numFrames <= 0) return new Float32Array(input);

    const window = hannWindow(this.frameSize);
    const hops: number[] = [];
    let totalOutput = 0;

    for (let f = 0; f < numFrames; f++) {
      const prime = primes[f % primes.length];
      const hopS = this.hopA * prime;
      hops.push(hopS);
      totalOutput += hopS;
    }

    const output = new Float32Array(totalOutput + this.frameSize);
    const windowSum = new Float32Array(totalOutput + this.frameSize);
    let outPos = 0;

    for (let f = 0; f < numFrames; f++) {
      const offset = f * this.hopA;
      const real = new Float32Array(this.frameSize);
      const imag = new Float32Array(this.frameSize);

      for (let i = 0; i < this.frameSize; i++) {
        real[i] = (input[offset + i] || 0) * window[i];
      }

      const result = fft(real, imag);
      const magnitude = new Float32Array(this.frameSize);

      for (let k = 0; k < this.frameSize; k++) {
        magnitude[k] = Math.sqrt(result.real[k] ** 2 + result.imag[k] ** 2);
      }

      const newReal = new Float32Array(this.frameSize);
      const newImag = new Float32Array(this.frameSize);
      for (let k = 0; k < this.frameSize; k++) {
        const rndPhase = Math.random() * 2 * Math.PI;
        newReal[k] = magnitude[k] * Math.cos(rndPhase);
        newImag[k] = magnitude[k] * Math.sin(rndPhase);
      }
      const recon = ifft(newReal, newImag);

      for (let i = 0; i < this.frameSize; i++) {
        if (outPos + i < output.length) {
          output[outPos + i] += recon[i] * window[i];
          windowSum[outPos + i] += window[i] * window[i];
        }
      }
      outPos += hops[f];
    }

    for (let i = 0; i < output.length; i++) {
      if (windowSum[i] > 1e-8) output[i] /= windowSum[i];
    }

    return output;
  }
}
