import * as Tone from 'tone';

interface ViolinVoice {
  osc1: Tone.Oscillator;
  osc2: Tone.Oscillator;
  filter: Tone.Filter;
  env: Tone.AmplitudeEnvelope;
  cleanupTimeoutId?: any;
}

export class ViolinSynth {
  // Voice Synthesis Parameters
  public attack = 0.15;       // Bow attack time
  public decay = 0.3;        // Decay
  public sustain = 0.8;      // Sustain level
  public release = 0.5;      // Release tail
  public cutoff = 2200;      // Warm low-pass cutoff
  public detuneCents = 15;   // Thick pitch detune for ensemble feel

  // FX Parameters
  public vibratoRate = 5.8;  // Violin vibrato speed (Hz)
  public vibratoDepth = 0.15; // Vibrato depth (semitones)

  // Voices Map
  private activeVoices: Map<string, ViolinVoice> = new Map();

  // Shared Output Effects Routing
  private vibrato: Tone.Vibrato;
  private chorus: Tone.Chorus;
  private outputVolume: Tone.Volume;

  constructor() {
    // 1. Setup vibrato
    this.vibrato = new Tone.Vibrato({
      frequency: this.vibratoRate,
      depth: this.vibratoDepth,
    });

    // 2. Setup Chorus
    this.chorus = new Tone.Chorus({
      frequency: 1.2,
      delayTime: 2.5,
      depth: 0.5,
      wet: 0.25
    }).start();

    // 3. Output Volume
    this.outputVolume = new Tone.Volume(-8);

    // FX Chain: voices -> vibrato -> chorus -> volume -> destination
    this.vibrato.connect(this.chorus);
    this.chorus.connect(this.outputVolume);
    this.outputVolume.toDestination();
  }

  connect(node: Tone.InputNode) {
    this.outputVolume.disconnect();
    this.outputVolume.connect(node);
    return this;
  }

  disconnect() {
    this.outputVolume.disconnect();
    return this;
  }

  triggerAttack(note: string | number, time?: number, velocity: number = 0.8) {
    const t = time ?? Tone.now();
    const freq = Tone.Frequency(note).toFrequency();
    const noteKey = String(note);

    if (this.activeVoices.has(noteKey)) {
      this.triggerRelease(note, t);
    }

    // Sawtooth oscillators provide the rich, buzzy harmonics characteristic of bowed strings
    const osc1 = new Tone.Oscillator({
      frequency: freq,
      type: 'sawtooth',
      volume: -8
    });

    const osc2 = new Tone.Oscillator({
      frequency: freq,
      type: 'sawtooth',
      detune: this.detuneCents,
      volume: -10
    });

    const filter = new Tone.Filter({
      frequency: this.cutoff,
      type: 'lowpass',
      rolloff: -12
    });

    const env = new Tone.AmplitudeEnvelope({
      attack: this.attack,
      decay: this.decay,
      sustain: this.sustain,
      release: this.release
    });

    // Connections
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.vibrato);

    osc1.start(t);
    osc2.start(t);
    env.triggerAttack(t, velocity);

    this.activeVoices.set(noteKey, { osc1, osc2, filter, env });
  }

  triggerRelease(note: string | number, time?: number) {
    const t = time ?? Tone.now();
    const noteKey = String(note);
    const voice = this.activeVoices.get(noteKey);

    if (voice) {
      voice.env.triggerRelease(t);

      const cleanupTime = t + this.release;
      voice.osc1.stop(cleanupTime);
      voice.osc2.stop(cleanupTime);

      this.activeVoices.delete(noteKey);

      const rawContext = Tone.getContext().rawContext;
      const isOffline = rawContext instanceof OfflineAudioContext || rawContext.constructor.name === 'OfflineAudioContext';

      if (!isOffline) {
        const delayMs = Math.max(0, (cleanupTime - Tone.now()) * 1000);
        voice.cleanupTimeoutId = setTimeout(() => {
          try {
            voice.osc1.dispose();
            voice.osc2.dispose();
            voice.filter.dispose();
            voice.env.dispose();
          } catch (err) {
            console.error('Error disposing violin voice nodes:', err);
          }
        }, delayMs + 100);
      }
    }
  }

  triggerAttackRelease(note: string | number, duration: number | string, time?: number, velocity: number = 0.8) {
    const t = time ?? Tone.now();
    const durationSeconds = Tone.Time(duration).toSeconds();

    this.triggerAttack(note, t, velocity);
    this.triggerRelease(note, t + durationSeconds);
  }

  setVolume(volumeDb: number) {
    this.outputVolume.volume.rampTo(volumeDb, 0.1);
  }

  setBrightness(cutoffHz: number) {
    this.cutoff = cutoffHz;
    const now = Tone.now();
    this.activeVoices.forEach((voice) => {
      voice.filter.frequency.setValueAtTime(cutoffHz, now);
    });
  }

  setDetune(cents: number) {
    this.detuneCents = cents;
    const now = Tone.now();
    this.activeVoices.forEach((voice) => {
      voice.osc2.detune.setValueAtTime(cents, now);
    });
  }

  setAttack(attackSec: number) {
    this.attack = attackSec;
  }

  setRelease(releaseSec: number) {
    this.release = releaseSec;
  }

  dispose() {
    this.activeVoices.forEach((voice) => {
      if (voice.cleanupTimeoutId) {
        clearTimeout(voice.cleanupTimeoutId);
      }
      try {
        voice.osc1.dispose();
        voice.osc2.dispose();
        voice.filter.dispose();
        voice.env.dispose();
      } catch (e) {}
    });
    this.activeVoices.clear();

    this.vibrato.dispose();
    this.chorus.dispose();
    this.outputVolume.dispose();
  }
}
