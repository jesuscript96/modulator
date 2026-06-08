import * as Tone from 'tone';

export class TPTFilter extends Tone.ToneAudioNode {
  readonly name = "TPTFilter";

  private filter: Tone.Filter;
  private shaper: Tone.WaveShaper;

  input: Tone.Filter;
  output: Tone.WaveShaper;

  constructor(frequency = 1000, Q = 1) {
    super();

    // 4-pole low-pass filter (24dB/octave) approximating a ladder filter
    this.filter = new Tone.Filter({
      frequency: frequency,
      type: "lowpass",
      rolloff: -24,
      Q: Q
    });

    // Soft clipping Curve: x / sqrt(x^2 + 1)
    const curveSize = 4096;
    const curve = new Float32Array(curveSize);
    for (let i = 0; i < curveSize; i++) {
      const x = (i / (curveSize - 1)) * 2 - 1; // Map index to [-1.0, 1.0]
      curve[i] = x / Math.sqrt(x * x + 1);    // VCV Rack soft clipping function
    }

    this.shaper = new Tone.WaveShaper(curve);

    // Routing: Input -> Filter -> Shaper -> Output
    this.filter.connect(this.shaper);

    this.input = this.filter;
    this.output = this.shaper;
  }

  setFrequency(freq: number, time?: number) {
    const t = time ?? Tone.now();
    this.filter.frequency.setValueAtTime(Math.max(20, Math.min(20000, freq)), t);
  }

  setQ(Q: number, time?: number) {
    const t = time ?? Tone.now();
    this.filter.Q.setValueAtTime(Math.max(0.1, Math.min(10, Q)), t);
  }

  dispose() {
    super.dispose();
    this.filter.dispose();
    this.shaper.dispose();
    return this;
  }
}
