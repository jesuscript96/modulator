/**
 * Cooley-Tukey radix-2 FFT.
 * Input arrays must have power-of-2 length.
 */
export function fft(
  realInput: Float32Array,
  imagInput: Float32Array
): { real: Float32Array; imag: Float32Array } {
  const n = realInput.length;
  const real = new Float32Array(realInput);
  const imag = new Float32Array(imagInput);

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly operations
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = (-2 * Math.PI) / size;

    for (let i = 0; i < n; i += size) {
      for (let k = 0; k < halfSize; k++) {
        const thetaR = Math.cos(angle * k);
        const thetaI = Math.sin(angle * k);

        const evenIdx = i + k;
        const oddIdx = i + k + halfSize;

        const tr = real[oddIdx] * thetaR - imag[oddIdx] * thetaI;
        const ti = real[oddIdx] * thetaI + imag[oddIdx] * thetaR;

        real[oddIdx] = real[evenIdx] - tr;
        imag[oddIdx] = imag[evenIdx] - ti;
        real[evenIdx] += tr;
        imag[evenIdx] += ti;
      }
    }
  }

  return { real, imag };
}

export function ifft(
  realInput: Float32Array,
  imagInput: Float32Array
): Float32Array {
  const n = realInput.length;
  const conjImag = new Float32Array(n);
  for (let i = 0; i < n; i++) conjImag[i] = -imagInput[i];

  const { real, imag } = fft(realInput, conjImag);

  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = real[i] / n;
  }
  return output;
}

export function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}
