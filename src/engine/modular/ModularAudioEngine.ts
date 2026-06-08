import * as Tone from 'tone';
import type { ModularModule, ModularCable } from '../../types';
import { useModularStore } from '../../stores/useModularStore';
import { CelestialPadSynth } from '../CelestialPadSynth';
import { ViolinSynth } from '../ViolinSynth';
import { GuitarSynth } from '../GuitarSynth';
import { TPTFilter } from '../dsp/TPTFilter';
import {
  fibonacci,
  padovan,
  collatz,
  logisticMap,
  primesUpTo,
  goldenSpiral,
  noise1D,
} from '../math/sequences';

export class ModularAudioEngine {
  // Audio Nodes
  private standardSynth: Tone.PolySynth;
  private celestialSynth: CelestialPadSynth;
  private violinSynth: ViolinSynth;
  private guitarSynth: GuitarSynth;
  private tptFilter: TPTFilter;

  // Connection/Module representations
  private modules: ModularModule[] = [];
  private cables: ModularCable[] = [];

  // Playback state
  private isPlaying = false;
  private step = 0;
  private eventId: number | null = null;
  private bpm = 120;

  // Real-time analysis for Scope module
  public analyser: Tone.Analyser;
  private lastOutputs: Record<string, number> = {};

  // Callback to push step/analyser updates to UI
  public onStepChange?: (step: number, outputs: Record<string, number>) => void;

  constructor() {
    // 1. Initialise Synthesizers
    this.standardSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 },
      volume: -10,
    });

    this.celestialSynth = new CelestialPadSynth();
    this.violinSynth = new ViolinSynth();
    this.guitarSynth = new GuitarSynth();

    // 2. Initialise DSP Filter
    this.tptFilter = new TPTFilter(1500, 1.5);

    // 3. Initialise Analyser for Visual Scope
    this.analyser = new Tone.Analyser('waveform', 256);

    // 4. Default Routing: Synths -> Filter -> Analyser -> Destination
    this.standardSynth.connect(this.tptFilter);
    this.celestialSynth.connect(this.tptFilter);
    this.violinSynth.connect(this.tptFilter);
    this.guitarSynth.connect(this.tptFilter);
    this.tptFilter.connect(this.analyser);
    this.analyser.toDestination();

    // 5. Sync from store
    this.syncFromStore();
    useModularStore.subscribe(() => {
      this.syncFromStore();
    });

    // 6. Schedule modular tick
    Tone.Transport.bpm.value = this.bpm;
    this.eventId = Tone.Transport.scheduleRepeat((time) => {
      this.tick(time);
    }, '16n');
  }

  private syncFromStore() {
    const state = useModularStore.getState();
    this.modules = state.modules;
    this.cables = state.cables;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  async togglePlayback() {
    await Tone.start();
    if (this.isPlaying) {
      Tone.Transport.pause();
      this.isPlaying = false;
    } else {
      Tone.Transport.start();
      this.isPlaying = true;
    }
    return this.isPlaying;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public getOutputs() {
    return this.lastOutputs;
  }

  /**
   * Helper to evaluate a mathematical modulator at a specific step.
   * Returns a normalized value [0.0, 1.0].
   */
  private evaluateModulator(m: ModularModule, currentStep: number): number {
    const typeIdx = m.params.type ?? 0;
    const complexity = Math.max(1, m.params.complexity ?? 5);
    const att = m.params.attenuation ?? 1.0;

    let rawVal = 0.5;

    switch (typeIdx) {
      case 0: // Fibonacci
        const fibVal = fibonacci((currentStep % complexity) + 1);
        rawVal = (fibVal % 10) / 10;
        break;
      case 1: // Golden Ratio
        const goldVal = goldenSpiral((currentStep % complexity) + 1);
        rawVal = (goldVal % 5) / 5;
        break;
      case 2: // Padovan
        const padVal = padovan((currentStep % complexity) + 1);
        rawVal = (padVal % 8) / 8;
        break;
      case 3: // Primes
        const primes = primesUpTo(100);
        if (primes.length > 0) {
          rawVal = (primes[currentStep % primes.length] % 12) / 12;
        }
        break;
      case 4: // Mandelbrot (orbit count approximation)
        const cx = -1.5 + ((currentStep % complexity) / complexity) * 2.0;
        let zx = 0, zy = 0, iter = 0;
        while (zx * zx + zy * zy < 4 && iter < 16) {
          const tmp = zx * zx - zy * zy + cx;
          zy = 2 * zx * zy;
          zx = tmp;
          iter++;
        }
        rawVal = iter / 16;
        break;
      case 5: // L-System
        const ch = (currentStep % 2 === 0) ? 0.8 : 0.2;
        rawVal = ch;
        break;
      case 6: // Collatz
        const colSeq = collatz(complexity + 3);
        const colVal = colSeq[currentStep % colSeq.length];
        rawVal = (colVal % 16) / 16;
        break;
      case 7: // Logistic Map
        const logSeq = logisticMap(0.5, 3.85, 50);
        rawVal = logSeq[currentStep % logSeq.length];
        break;
      case 8: // Pseudo-Noise
        rawVal = Math.abs(noise1D(currentStep * 0.3 * complexity));
        break;
      default:
        rawVal = 0.5;
    }

    return rawVal * att;
  }

  /**
   * Evaluates user custom scripts safely.
   */
  private evaluateScript(m: ModularModule, currentStep: number, time: number): number {
    const script = m.scriptCode || 'return Math.sin(step) * 0.5 + 0.5;';
    const att = m.params.attenuation ?? 1.0;
    try {
      // Create executable function with safe scope
      const runner = new Function('step', 'time', 'Math', `
        try {
          ${script}
        } catch(e) {
          return 0;
        }
      `);
      let result = runner(currentStep, time, Math);
      if (typeof result !== 'number' || isNaN(result)) {
        result = 0.5;
      }
      return Math.max(0, Math.min(1, result)) * att;
    } catch (e) {
      return 0.0;
    }
  }

  /**
   * The core clock loop, executing modular modulation routes.
   */
  private tick(time: number) {
    this.step++;

    // 1. Calculate outputs for all active Modulator & Script modules
    const activeOutputs: Record<string, number> = {};

    for (const m of this.modules) {
      if (m.type === 'modulator') {
        const val = this.evaluateModulator(m, this.step);
        activeOutputs[`${m.id}-output-val`] = val;
      } else if (m.type === 'script') {
        const val = this.evaluateScript(m, this.step, time);
        activeOutputs[`${m.id}-output-val`] = val;
      }
    }

    this.lastOutputs = activeOutputs;

    // 2. Process cable connections (Control Voltage Routing)
    // Map of input port IDs to their incoming modulated value
    const incomingModulations: Record<string, number> = {};
    for (const c of this.cables) {
      const srcVal = activeOutputs[c.fromPortId];
      if (srcVal !== undefined) {
        incomingModulations[c.toPortId] = srcVal;
      }
    }

    // 3. Apply modulations to Synths and Filters
    let pitchOffsetSemitones = 0;
    let gateTriggered = false;
    let cutoffCV = 0.5; // default center
    let detuneCV = 0.0;

    for (const m of this.modules) {
      if (m.type === 'synth') {
        // Collect values at input ports
        const pitchCV = incomingModulations[`${m.id}-input-pitch`] ?? 0.5; // range [0, 1]
        const gateCV = incomingModulations[`${m.id}-input-gate`] ?? 0.0;
        const localCutoffCV = incomingModulations[`${m.id}-input-cutoff`] ?? 0.5;

        // Map pitch CV (0..1) to semitones (-12..+12)
        pitchOffsetSemitones = Math.round((pitchCV - 0.5) * 24);

        // Map gate CV trigger (if CV goes above 0.3)
        // We trigger note if there is a pulse on the gate
        // For generative sequences, we trigger a note every step if gate is patched and high
        if (gateCV > 0.3) {
          gateTriggered = true;
        }

        cutoffCV = localCutoffCV;
      }
    }

    // 4. Trigger synth sounds
    const activeSynthType = this.getActiveSynthType();

    // Map cutoff CV (0..1) to Hz (200Hz to 6000Hz)
    const targetCutoff = 200 + cutoffCV * 5800;
    this.tptFilter.setFrequency(targetCutoff, time);

    if (gateTriggered) {
      // Find base pitch of active synth
      const synthModule = this.modules.find(m => m.type === 'synth');
      const baseMidi = synthModule?.params.basePitch ?? 60;
      const noteFreq = Tone.Frequency(baseMidi + pitchOffsetSemitones, 'midi').toNote();

      if (activeSynthType === 'standard') {
        this.standardSynth.triggerAttackRelease(noteFreq, '16n', time, 0.7);
      } else if (activeSynthType === 'celestial') {
        this.celestialSynth.setBrightness(targetCutoff);
        this.celestialSynth.triggerAttackRelease(noteFreq, '8n', time, 0.8);
      } else if (activeSynthType === 'violin') {
        this.violinSynth.triggerAttackRelease(noteFreq, '8n', time, 0.7);
      } else if (activeSynthType === 'guitar') {
        this.guitarSynth.triggerAttackRelease(noteFreq, '8n', time, 0.8);
      }
    }

    // Notify UI React layer
    if (this.onStepChange) {
      Tone.Draw.schedule(() => {
        if (this.onStepChange) {
          this.onStepChange(this.step % 16, activeOutputs);
        }
      }, time);
    }
  }

  private getActiveSynthType(): 'standard' | 'celestial' | 'violin' | 'guitar' {
    const synthModule = this.modules.find(m => m.type === 'synth');
    if (!synthModule) return 'standard';
    const typeIdx = synthModule.params.type ?? 0;
    switch (typeIdx) {
      case 0: return 'standard';
      case 1: return 'celestial';
      case 2: return 'violin';
      case 3: return 'guitar';
      default: return 'standard';
    }
  }

  dispose() {
    if (this.eventId !== null) {
      Tone.Transport.clear(this.eventId);
    }
    this.standardSynth.dispose();
    this.celestialSynth.dispose();
    this.violinSynth.dispose();
    this.guitarSynth.dispose();
    this.tptFilter.dispose();
    this.analyser.dispose();
  }
}
