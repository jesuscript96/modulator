import * as Tone from 'tone';

interface CelestialVoice {
  osc1: Tone.Oscillator;
  osc2: Tone.Oscillator;
  filter: Tone.Filter;
  env: Tone.AmplitudeEnvelope;
  cleanupTimeoutId?: any; // To cancel cleanup if the note is triggered again
}

export class CelestialPadSynth {
  // Voice Synthesis Parameters
  public attack = 2.0;       // Slow attack (1.5 to 3.0s)
  public decay = 1.0;        // Moderate decay
  public sustain = 0.8;      // High sustain
  public release = 4.0;      // Very long release/decay tail (3.0 to 5.0s)
  public cutoff = 800;       // Warm low-pass cutoff (600Hz to 1000Hz)
  public detuneCents = 12;   // Light pitch detune on Osc 2 (+10 to +15 cents)

  // FX Parameters
  public reverbDecay = 7.0;  // Giant space reverb decay (>6s)
  public reverbWet = 0.5;    // 50% wet/dry mix
  public chorusWet = 0.45;   // Ambient chorus width

  // Voices Map
  private activeVoices: Map<string, CelestialVoice> = new Map();

  // Shared Output Effects Routing
  private chorus: Tone.Chorus;
  private reverb: Tone.Reverb;
  private outputVolume: Tone.Volume;

  constructor() {
    // 1. Setup Chorus / Modulation
    this.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: this.chorusWet
    }).start(); // CRITICAL: Tone.Chorus LFO must be explicitly started

    // 2. Setup Reverb
    this.reverb = new Tone.Reverb({
      decay: this.reverbDecay,
      wet: this.reverbWet
    });

    // 3. Setup Main Volume Output Node
    this.outputVolume = new Tone.Volume(-12); // Slightly lower to avoid clipping chords

    // 4. Connect FX Chain: voices -> chorus -> reverb -> volume -> destination
    this.chorus.connect(this.reverb);
    this.reverb.connect(this.outputVolume);
    this.outputVolume.toDestination();
  }

  /**
   * Connects the synth output to another Tone.js AudioNode.
   */
  connect(node: Tone.InputNode) {
    this.outputVolume.disconnect();
    this.outputVolume.connect(node);
    return this;
  }

  /**
   * Disconnects the synth output.
   */
  disconnect() {
    this.outputVolume.disconnect();
    return this;
  }

  /**
   * Triggers a note on (Note On).
   */
  triggerAttack(note: string | number, time?: number, velocity: number = 0.8) {
    const t = time ?? Tone.now();
    const freq = Tone.Frequency(note).toFrequency();
    const noteKey = String(note);

    // If this note is already playing, release it immediately before restarting
    if (this.activeVoices.has(noteKey)) {
      this.triggerRelease(note, t);
    }

    // Create dynamic subtractive synthesis voice
    // Osc 1: Sawtooth (warm, harmonics-rich base)
    const osc1 = new Tone.Oscillator({
      frequency: freq,
      type: 'sawtooth',
      volume: -9 // Balance against osc2
    });

    // Osc 2: Triangle (warms up low-mid, detuned for chorus beating)
    const osc2 = new Tone.Oscillator({
      frequency: freq,
      type: 'triangle',
      detune: this.detuneCents,
      volume: -7
    });

    // Filter: 24dB/octave Low Pass Filter to smooth out high-frequencies
    const filter = new Tone.Filter({
      frequency: this.cutoff,
      type: 'lowpass',
      rolloff: -24
    });

    // Amplitude Envelope (Slow Celestial Attack & Long release)
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
    env.connect(this.chorus);

    // Start oscillators and trigger ADSR attack
    osc1.start(t);
    osc2.start(t);
    env.triggerAttack(t, velocity);

    // Save voice reference
    this.activeVoices.set(noteKey, { osc1, osc2, filter, env });
  }

  /**
   * Releases a playing note (Note Off).
   */
  triggerRelease(note: string | number, time?: number) {
    const t = time ?? Tone.now();
    const noteKey = String(note);
    const voice = this.activeVoices.get(noteKey);

    if (voice) {
      // Trigger release phase
      voice.env.triggerRelease(t);

      // Schedule cleanup after the release tail finishes
      const releaseDuration = this.release;
      const cleanupTime = t + releaseDuration;

      // Stop oscillators at the end of the release
      voice.osc1.stop(cleanupTime);
      voice.osc2.stop(cleanupTime);

      this.activeVoices.delete(noteKey);

      // To prevent leaks, dispose of Voice nodes.
      // We check if the context is an OfflineAudioContext (which is GC'ed as a whole after rendering).
      // If it is regular real-time audio, we use setTimeout based on WebAudio time difference,
      // which is robust whether Tone.Transport is running or stopped!
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
            console.error('Error disposing celestial voice nodes:', err);
          }
        }, delayMs + 100);
      }
    }
  }

  /**
   * Plays a note for a set duration.
   */
  triggerAttackRelease(note: string | number, duration: number | string, time?: number, velocity: number = 0.8) {
    const t = time ?? Tone.now();
    const durationSeconds = Tone.Time(duration).toSeconds();

    this.triggerAttack(note, t, velocity);
    this.triggerRelease(note, t + durationSeconds);
  }

  // ----------------------------------------------------
  // Dynamic Real-Time Param Controllers
  // ----------------------------------------------------

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

  setReverbDecay(decaySec: number) {
    this.reverbDecay = decaySec;
    this.reverb.decay = decaySec;
  }

  setReverbWet(mixValue: number) {
    this.reverbWet = mixValue;
    this.reverb.wet.value = mixValue;
  }

  /**
   * Release and dispose of all active nodes in the synth.
   */
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

    this.chorus.dispose();
    this.reverb.dispose();
    this.outputVolume.dispose();
  }
}
