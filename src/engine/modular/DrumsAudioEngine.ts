import * as Tone from 'tone';
import { useDrumsStore } from '../../stores/useDrumsStore';
import type { DrumTrackKey } from '../../stores/useDrumsStore';
import {
  fibonacci,
  padovan,
  collatz,
  logisticMap,
  primesUpTo,
  goldenSpiral,
  noise1D,
} from '../math/sequences';

export class DrumsAudioEngine {
  // Synthesizers / DSP Nodes
  private kickOsc: Tone.Oscillator;
  private kickEnv: Tone.AmplitudeEnvelope;
  private kickFilter: Tone.Filter;
  private kickDistortion: Tone.Distortion;

  private snareOsc: Tone.Oscillator;
  private snareOscEnv: Tone.AmplitudeEnvelope;
  private snareNoise: Tone.Noise;
  private snareNoiseFilter: Tone.Filter;
  private snareNoiseEnv: Tone.AmplitudeEnvelope;

  private chSynth: Tone.MetalSynth;
  private ohSynth: Tone.MetalSynth;

  // Clap synth: filtered noise burst with reflections
  private cpNoise: Tone.Noise;
  private cpFilter: Tone.Filter;
  private cpEnv: Tone.AmplitudeEnvelope;

  // Cowbell synth: two square oscillators bandpassed
  private cbOsc1: Tone.Oscillator;
  private cbOsc2: Tone.Oscillator;
  private cbFilter: Tone.Filter;
  private cbEnv: Tone.AmplitudeEnvelope;

  // Mixer Channels
  private channels: Record<DrumTrackKey, Tone.Channel>;
  private masterVolume: Tone.Volume;

  // Analysis
  public analyser: Tone.Analyser;
  
  // Timing
  private eventId: number | null = null;
  private tickIndex = 0;
  private lastOutputs: Record<string, number> = {};

  constructor() {
    const now = Tone.now();

    // 1. Kick Synth
    this.kickOsc = new Tone.Oscillator({ type: 'sine' }).start();
    this.kickEnv = new Tone.AmplitudeEnvelope({ attack: 0.005, decay: 0.3, sustain: 0, release: 0.3 });
    this.kickFilter = new Tone.Filter(200, 'lowpass');
    this.kickDistortion = new Tone.Distortion(0.15);
    this.kickOsc.connect(this.kickFilter);
    this.kickFilter.connect(this.kickEnv);
    this.kickEnv.connect(this.kickDistortion);

    // 2. Snare Synth
    this.snareOsc = new Tone.Oscillator({ type: 'triangle' }).start();
    this.snareOscEnv = new Tone.AmplitudeEnvelope({ attack: 0.005, decay: 0.08, sustain: 0, release: 0.08 });
    this.snareNoise = new Tone.Noise('white').start();
    this.snareNoiseFilter = new Tone.Filter(1800, 'bandpass');
    this.snareNoiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.005, decay: 0.18, sustain: 0, release: 0.18 });
    this.snareOsc.connect(this.snareOscEnv);
    this.snareNoise.connect(this.snareNoiseFilter);
    this.snareNoiseFilter.connect(this.snareNoiseEnv);

    // 3. Closed Hat
    this.chSynth = new Tone.MetalSynth({
      frequency: 300,
      envelope: { attack: 0.001, decay: 0.08, release: 0.08 },
      resonance: 8000,
      harmonicity: 5.1,
      volume: -4,
    });

    // 4. Open Hat
    this.ohSynth = new Tone.MetalSynth({
      frequency: 250,
      envelope: { attack: 0.002, decay: 0.35, release: 0.35 },
      resonance: 8500,
      harmonicity: 5.1,
      volume: -4,
    });

    // 5. Clap Synth
    this.cpNoise = new Tone.Noise('pink').start();
    this.cpFilter = new Tone.Filter(1500, 'bandpass');
    this.cpEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 });
    this.cpNoise.connect(this.cpFilter);
    this.cpFilter.connect(this.cpEnv);

    // 6. Cowbell Synth
    this.cbOsc1 = new Tone.Oscillator(587, 'square').start(); // D5
    this.cbOsc2 = new Tone.Oscillator(845, 'square').start(); // G#5 approx
    this.cbFilter = new Tone.Filter(800, 'bandpass');
    this.cbEnv = new Tone.AmplitudeEnvelope({ attack: 0.002, decay: 0.25, sustain: 0, release: 0.25 });
    this.cbOsc1.connect(this.cbFilter);
    this.cbOsc2.connect(this.cbFilter);
    this.cbFilter.connect(this.cbEnv);

    // Mixer channels
    this.channels = {
      bd: new Tone.Channel({ volume: -4, pan: -0.1 }),
      sd: new Tone.Channel({ volume: -6, pan: 0.1 }),
      ch: new Tone.Channel({ volume: -8, pan: -0.3 }),
      oh: new Tone.Channel({ volume: -8, pan: 0.3 }),
      cp: new Tone.Channel({ volume: -10, pan: -0.2 }),
      cb: new Tone.Channel({ volume: -12, pan: 0.2 }),
    };

    // Connections
    this.kickDistortion.connect(this.channels.bd);
    
    const snareMix = new Tone.Gain();
    this.snareOscEnv.connect(snareMix);
    this.snareNoiseEnv.connect(snareMix);
    snareMix.connect(this.channels.sd);

    this.chSynth.connect(this.channels.ch);
    this.ohSynth.connect(this.channels.oh);
    this.cpEnv.connect(this.channels.cp);
    this.cbEnv.connect(this.channels.cb);

    this.masterVolume = new Tone.Volume(0);
    this.analyser = new Tone.Analyser('waveform', 256);

    Object.values(this.channels).forEach((chan) => chan.connect(this.masterVolume));
    this.masterVolume.connect(this.analyser);
    this.analyser.toDestination();

    // Schedule Transport Tick
    this.eventId = Tone.Transport.scheduleRepeat((time) => {
      this.tick(time);
    }, '16n');
  }

  private evaluateModulator(typeIdx: number, complexity: number, step: number): number {
    let rawVal = 0.5;
    const s = step + 1;
    switch (typeIdx) {
      case 0: // Fibonacci
        rawVal = (fibonacci(s % complexity) % 10) / 10;
        break;
      case 1: // Golden Ratio
        rawVal = (goldenSpiral(s % complexity) % 5) / 5;
        break;
      case 2: // Padovan
        rawVal = (padovan(s % complexity) % 8) / 8;
        break;
      case 3: // Primes
        const primes = primesUpTo(100);
        if (primes.length > 0) {
          rawVal = (primes[s % primes.length] % 12) / 12;
        }
        break;
      case 4: // Collatz
        const colSeq = collatz(complexity + 3);
        const colVal = colSeq[s % colSeq.length];
        rawVal = (colVal % 16) / 16;
        break;
      case 5: // Logistic Map
        const logSeq = logisticMap(0.5, 3.85, 50);
        rawVal = logSeq[s % logSeq.length];
        break;
      case 6: // Pseudo-Noise
        rawVal = Math.abs(noise1D(s * 0.35 * complexity));
        break;
    }
    return rawVal;
  }

  async togglePlayback() {
    await Tone.start();
    const store = useDrumsStore.getState();
    if (store.isPlaying) {
      Tone.Transport.pause();
      store.setPlaying(false);
    } else {
      Tone.Transport.start();
      store.setPlaying(true);
    }
  }

  private tick(time: number) {
    this.tickIndex++;
    const stepIdx = (this.tickIndex - 1) % 16;
    
    const store = useDrumsStore.getState();
    
    // Sync BPM
    if (Tone.Transport.bpm.value !== store.bpm) {
      Tone.Transport.bpm.value = store.bpm;
    }

    // Update current step in store
    Tone.Draw.schedule(() => {
      store.setCurrentStep(stepIdx);
    }, time);

    // 1. Evaluate Math Modulator (LFO)
    const lfoVal = this.evaluateModulator(
      store.lfoParams.type,
      store.lfoParams.complexity,
      this.tickIndex
    ) * store.lfoParams.attenuation;

    this.lastOutputs['lfo_cv'] = lfoVal;

    // Helper to fetch mod value
    const getModdedValue = (targetKey: string, baseVal: number, scaleRange: number): number => {
      const mod = store.modulations[targetKey];
      if (mod && mod.source === 'lfo') {
        const modOffset = (lfoVal - 0.5) * scaleRange * mod.depth;
        return baseVal + modOffset;
      }
      return baseVal;
    };

    // Update Mixer volumes & pans on tick
    const tracks: DrumTrackKey[] = ['bd', 'sd', 'ch', 'oh', 'cp', 'cb'];
    tracks.forEach((track) => {
      const vol = store.mixerParams[`vol_${track}`] ?? -6;
      const pan = store.mixerParams[`pan_${track}`] ?? 0;
      const mute = store.mixerParams[`mute_${track}`] === 1;

      this.channels[track].volume.setValueAtTime(mute ? -Infinity : vol, time);
      this.channels[track].pan.setValueAtTime(pan, time);
    });

    // 2. Trigger active steps
    // BD
    if (store.patterns.bd[stepIdx]) {
      const basePitch = store.synthParams.bd.pitch;
      const baseDecay = store.synthParams.bd.decay;
      const click = store.synthParams.bd.click;
      const drive = store.synthParams.bd.drive;

      const pitchVal = getModdedValue('bd_pitch', basePitch, 24); // +/- 12 semitones
      const decayVal = Math.max(0.02, getModdedValue('bd_decay', baseDecay, baseDecay * 1.5));

      const freq = Tone.Frequency(pitchVal, 'midi').toFrequency();
      this.kickOsc.frequency.setValueAtTime(freq, time);

      // Pitch sweep
      const sweepFreq = freq * (1 + click * 3.5);
      this.kickOsc.frequency.setValueAtTime(sweepFreq, time);
      this.kickOsc.frequency.exponentialRampToValueAtTime(freq, time + 0.035);

      this.kickEnv.decay = decayVal;
      this.kickEnv.release = decayVal;
      this.kickDistortion.distortion = drive;

      this.kickEnv.triggerAttackRelease(decayVal, time);
    }

    // SD
    if (store.patterns.sd[stepIdx]) {
      const baseTone = store.synthParams.sd.tone;
      const baseDecay = store.synthParams.sd.decay;
      const snappy = store.synthParams.sd.snappy;
      const cutoff = store.synthParams.sd.cutoff;

      const decayVal = Math.max(0.02, getModdedValue('sd_decay', baseDecay, baseDecay * 1.5));
      const snappyVal = Math.max(0, Math.min(1.0, snappy + (lfoVal - 0.5) * 0.8 * (store.modulations['sd_snappy']?.source === 'lfo' ? store.modulations['sd_snappy'].depth : 0)));

      this.snareOsc.frequency.setValueAtTime(baseTone, time);
      this.snareOsc.frequency.exponentialRampToValueAtTime(baseTone * 0.7, time + 0.04);
      this.snareNoiseFilter.frequency.setValueAtTime(cutoff, time);

      this.snareOscEnv.decay = decayVal * 0.65;
      this.snareOscEnv.release = decayVal * 0.65;
      this.snareNoiseEnv.decay = decayVal;
      this.snareNoiseEnv.release = decayVal;

      this.snareOsc.volume.setValueAtTime(Tone.gainToDb(1 - snappyVal), time);
      this.snareNoise.volume.setValueAtTime(Tone.gainToDb(snappyVal), time);

      this.snareOscEnv.triggerAttackRelease(decayVal * 0.65, time);
      this.snareNoiseEnv.triggerAttackRelease(decayVal, time);
    }

    // CH
    if (store.patterns.ch[stepIdx]) {
      const baseDecay = store.synthParams.ch.decay;
      const tone = store.synthParams.ch.tone;

      const decayVal = Math.max(0.01, getModdedValue('ch_decay', baseDecay, baseDecay * 1.5));
      
      this.chSynth.resonance = tone;
      this.chSynth.envelope.decay = decayVal;
      this.chSynth.envelope.release = decayVal;
      this.chSynth.triggerAttack(time);
    }

    // OH
    if (store.patterns.oh[stepIdx]) {
      const baseDecay = store.synthParams.oh.decay;
      const tone = store.synthParams.oh.tone;

      const toneVal = Math.max(2000, getModdedValue('oh_tone', tone, 4000));

      this.ohSynth.resonance = toneVal;
      this.ohSynth.envelope.decay = baseDecay;
      this.ohSynth.envelope.release = baseDecay;
      this.ohSynth.triggerAttack(time);
    }

    // CP
    if (store.patterns.cp[stepIdx]) {
      const baseDecay = store.synthParams.cp.decay;
      const filter = store.synthParams.cp.filter;
      const density = store.synthParams.cp.density;

      const filterVal = Math.max(200, getModdedValue('cp_filter', filter, 1000));
      this.cpFilter.frequency.setValueAtTime(filterVal, time);

      this.cpEnv.decay = baseDecay;
      this.cpEnv.release = baseDecay;

      // Simulate clap hand reflections: trigger 3 very fast tiny envelope ramps followed by a full decay trigger
      const delayStep = 0.012;
      for (let i = 0; i < density - 1; i++) {
        const trigTime = time + i * delayStep;
        this.cpEnv.triggerAttackRelease(0.008, trigTime, 0.5);
      }
      this.cpEnv.triggerAttackRelease(baseDecay, time + (density - 1) * delayStep);
    }

    // CB
    if (store.patterns.cb[stepIdx]) {
      const basePitch = store.synthParams.cb.pitch;
      const baseDecay = store.synthParams.cb.decay;

      const decayVal = Math.max(0.02, getModdedValue('cb_decay', baseDecay, baseDecay * 1.5));
      const rootFreq = Tone.Frequency(basePitch, 'midi').toFrequency();

      // Cowbell formula: 808 uses two square waves in frequency ratio ~1.45 (e.g. 540Hz and 800Hz)
      this.cbOsc1.frequency.setValueAtTime(rootFreq, time);
      this.cbOsc2.frequency.setValueAtTime(rootFreq * 1.48, time);

      this.cbEnv.decay = decayVal;
      this.cbEnv.release = decayVal;

      this.cbEnv.triggerAttackRelease(decayVal, time);
    }
  }

  public getOutputs() {
    return this.lastOutputs;
  }

  dispose() {
    if (this.eventId !== null) {
      Tone.Transport.clear(this.eventId);
    }

    this.kickOsc.dispose();
    this.kickEnv.dispose();
    this.kickFilter.dispose();
    this.kickDistortion.dispose();

    this.snareOsc.dispose();
    this.snareOscEnv.dispose();
    this.snareNoise.dispose();
    this.snareNoiseFilter.dispose();
    this.snareNoiseEnv.dispose();

    this.chSynth.dispose();
    this.ohSynth.dispose();

    this.cpNoise.dispose();
    this.cpFilter.dispose();
    this.cpEnv.dispose();

    this.cbOsc1.dispose();
    this.cbOsc2.dispose();
    this.cbFilter.dispose();
    this.cbEnv.dispose();

    Object.values(this.channels).forEach((chan) => chan.dispose());
    this.masterVolume.dispose();
    this.analyser.dispose();
  }
}
