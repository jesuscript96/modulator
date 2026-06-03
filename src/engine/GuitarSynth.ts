import * as Tone from 'tone';

interface GuitarVoice {
  osc1: Tone.Oscillator;
  osc2: Tone.Oscillator;
  filter: Tone.Filter;
  env: Tone.AmplitudeEnvelope;
  cleanupTimeoutId?: any;
}

export class GuitarSynth {
  // Voice Synthesis Parameters
  public attack = 0.005;       // Very fast pluck transient
  public decay = 1.2;          // Natural pluck decay
  public sustain = 0.02;       // Plucks do not hold indefinitely
  public release = 0.8;        // Clean release tail
  public cutoff = 3500;        // Starting brightness frequency of pluck sweep
  public detuneCents = 12;     // Subtle detune for string chorus

  // Voices Map
  private activeVoices: Map<string, GuitarVoice> = new Map();

  // Shared Output Volume Routing
  private outputVolume: Tone.Volume;

  constructor() {
    this.outputVolume = new Tone.Volume(-6);
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

    // Triangle wave for guitar body and warmth
    const osc1 = new Tone.Oscillator({
      frequency: freq,
      type: 'triangle',
      volume: -4
    });

    // Sawtooth wave for string bite, pluck transient, and upper harmonics
    const osc2 = new Tone.Oscillator({
      frequency: freq,
      type: 'sawtooth',
      detune: this.detuneCents,
      volume: -16
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
    env.connect(this.outputVolume);

    // Playback
    osc1.start(t);
    osc2.start(t);

    // Emulate string physics: filter cutoff sweep starts high and falls off quickly
    filter.frequency.setValueAtTime(this.cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.35);

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
            console.error('Error disposing guitar voice nodes:', err);
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
    // We update the filter starting frequency of active voices if they are still shaping
    const now = Tone.now();
    this.activeVoices.forEach((voice) => {
      voice.filter.frequency.setValueAtTime(cutoffHz, now);
      voice.filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);
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
    this.outputVolume.dispose();
  }
}
