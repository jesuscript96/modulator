/**
 * Re-exports for backward compatibility.
 * The math functions now live in engine/math/sequences.ts
 * but this file keeps the same public API so LabPage imports don't break.
 */
import * as Tone from 'tone';
import { euclidean as _euclidean, fibonacci as _fibonacci, noise1D as _noise1D, applyMuteRule as _applyMuteRule } from './engine/math/sequences';

export const euclidean = _euclidean;
export const fibonacci = _fibonacci;
export const noise1D = _noise1D;
export const applyMuteRule = _applyMuteRule;

export type MuteRule = 'none' | 'golden' | 'fibonacci' | 'goldenNoise';

export class AudioEngine {
    grainPlayer: Tone.GrainPlayer | null = null;
    filter: Tone.Filter;
    delay: Tone.FeedbackDelay;
    reverb: Tone.Freeverb;

    private hihatFilter: Tone.Filter;
    private hihatGain: Tone.Gain;

    kick: Tone.MembraneSynth;
    snare: Tone.NoiseSynth;
    hihat: Tone.NoiseSynth;
    perc: Tone.MembraneSynth;

    step = 0;
    isPlaying = false;
    eventId: number;

    onStep?: (step: number) => void;
    onParamChange?: (params: any) => void;

    mathRule: 'none' | 'fibonacci' | 'golden' | 'noise' = 'none';
    complexity = 1;

    patterns = {
        kick: _euclidean(0, 16),
        snare: _euclidean(0, 16),
        hihat: _euclidean(0, 16),
        perc: _euclidean(0, 16)
    };

    constructor() {
        this.filter = new Tone.Filter(2000, "lowpass");
        this.delay = new Tone.FeedbackDelay("8n", 0.2);
        this.reverb = new Tone.Freeverb({ roomSize: 0.7, dampening: 4000 });

        this.filter.connect(this.delay);
        this.delay.connect(this.reverb);
        this.reverb.toDestination();

        this.hihatFilter = new Tone.Filter(7000, "highpass");
        this.hihatGain = new Tone.Gain(1.5);
        this.hihatFilter.connect(this.hihatGain);
        this.hihatGain.toDestination();

        this.kick = new Tone.MembraneSynth({ volume: 0 }).connect(this.filter);
        this.snare = new Tone.NoiseSynth({
            volume: -4,
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
        }).connect(this.filter);
        this.hihat = new Tone.NoiseSynth({
            volume: 2,
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 }
        }).connect(this.hihatFilter);
        this.perc = new Tone.MembraneSynth({
            volume: -4,
            pitchDecay: 0.01,
            octaves: 2,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
        }).connect(this.filter);

        Tone.Transport.bpm.value = 120;

        this.eventId = Tone.Transport.scheduleRepeat((time) => {
            this.tick(time);
        }, "16n");
    }

    dispose() {
        Tone.Transport.clear(this.eventId);
        this.kick.dispose();
        this.snare.dispose();
        this.hihat.dispose();
        this.perc.dispose();
        this.filter.dispose();
        this.delay.dispose();
        this.reverb.dispose();
        this.hihatFilter.dispose();
        this.hihatGain.dispose();
        if (this.grainPlayer) this.grainPlayer.dispose();
    }

    async loadSample(url: string) {
        if (this.grainPlayer) {
            this.grainPlayer.dispose();
        }
        this.grainPlayer = new Tone.GrainPlayer({ url, volume: 0 }).connect(this.filter);
        await Tone.loaded();
        this.grainPlayer.loop = true;
        if (this.isPlaying) {
            this.grainPlayer.start();
        }
    }

    updateEuclidean(track: 'kick'|'snare'|'hihat'|'perc', k: number, n: number) {
        this.patterns[track] = _euclidean(k, n);
    }

    setPattern(track: 'kick'|'snare'|'hihat'|'perc', pattern: boolean[]) {
        this.patterns[track] = pattern;
    }

    async renderDrumPattern(bars: number = 2): Promise<AudioBuffer> {
        const bpm = Tone.getTransport().bpm.value;
        const sixteenthDur = 60 / bpm / 4;
        const totalSteps = bars * 16;
        const duration = totalSteps * sixteenthDur + 0.5;
        const patterns = {
            kick: [...this.patterns.kick],
            snare: [...this.patterns.snare],
            hihat: [...this.patterns.hihat],
            perc: [...this.patterns.perc],
        };

        const toneBuffer = await Tone.Offline(() => {
            const kick = new Tone.MembraneSynth({ volume: 0 }).toDestination();
            const snare = new Tone.NoiseSynth({
                volume: -4,
                noise: { type: "white" },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
            }).toDestination();
            const hf = new Tone.Filter(7000, "highpass").toDestination();
            const hihat = new Tone.NoiseSynth({
                volume: 2,
                noise: { type: "white" },
                envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 }
            }).connect(hf);
            const perc = new Tone.MembraneSynth({
                volume: -4,
                pitchDecay: 0.01,
                octaves: 2,
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
            }).toDestination();

            for (let step = 0; step < totalSteps; step++) {
                const s = step % 16;
                const time = step * sixteenthDur;
                if (patterns.kick[s]) kick.triggerAttackRelease("C1", sixteenthDur * 2, time);
                if (patterns.snare[(s + 4) % 16]) snare.triggerAttackRelease(sixteenthDur, time);
                if (patterns.hihat[s]) hihat.triggerAttackRelease(sixteenthDur * 0.5, time);
                if (patterns.perc[s]) perc.triggerAttackRelease("G3", sixteenthDur, time, 0.5);
            }
        }, duration);

        return toneBuffer.get() as AudioBuffer;
    }

    tick(time: number) {
        const currentStep = this.step % 16;

        if (this.patterns.kick[currentStep]) this.kick.triggerAttackRelease("C1", "8n", time);
        if (this.patterns.snare[(currentStep + 4) % 16]) this.snare.triggerAttackRelease("16n", time);
        if (this.patterns.hihat[currentStep]) this.hihat.triggerAttackRelease("32n", time);
        if (this.patterns.perc[currentStep]) this.perc.triggerAttackRelease("G3", "16n", time, 0.5);

        let newGrainSize = 0.1;
        let newOverlap = 0.1;
        let newFilterFreq = 2000;
        let newDetune = 0;

        if (this.grainPlayer) {
            newGrainSize = Number(this.grainPlayer.grainSize);
            newOverlap = Number(this.grainPlayer.overlap);
            newDetune = this.grainPlayer.detune;
        }

        const currentFreq = this.filter.frequency.value;
        newFilterFreq = typeof currentFreq === 'number' ? currentFreq : 2000;

        if (this.mathRule === 'fibonacci') {
            const fib = _fibonacci((this.step % Math.max(1, this.complexity)) + 1);
            newGrainSize = Math.max(0.01, Math.min(0.5, fib * 0.01));
            newOverlap = Math.max(0.01, Math.min(0.5, fib * 0.02));
        } else if (this.mathRule === 'golden') {
            newFilterFreq = 200 * Math.pow(1.618, (this.step % Math.max(1, this.complexity)));
            newFilterFreq = Math.min(10000, newFilterFreq);
        } else if (this.mathRule === 'noise') {
            const n = _noise1D(this.step * 0.1 * this.complexity);
            newOverlap = Math.max(0.01, Math.min(0.2, Math.abs(n) * 0.2));
            newDetune = n * 1200;
        } else {
            newFilterFreq = 2000;
        }

        if (this.grainPlayer) {
            this.grainPlayer.grainSize = newGrainSize;
            this.grainPlayer.overlap = newOverlap;
            this.grainPlayer.detune = newDetune;
        }

        if (isFinite(newFilterFreq) && newFilterFreq > 0) {
            this.filter.frequency.rampTo(newFilterFreq, 0.1, time);
        }

        if (this.onParamChange) {
            Tone.Draw.schedule(() => {
                this.onParamChange!({
                    grainSize: newGrainSize,
                    overlap: newOverlap,
                    filterFreq: newFilterFreq,
                    detune: newDetune
                });
            }, time);
        }

        if (this.onStep) {
            Tone.Draw.schedule(() => {
                this.onStep!(currentStep);
            }, time);
        }

        this.step++;
    }

    async togglePlayback() {
        await Tone.start();

        if (this.isPlaying) {
            Tone.Transport.pause();
            if (this.grainPlayer) this.grainPlayer.stop();
            this.isPlaying = false;
        } else {
            Tone.Transport.start();
            if (this.grainPlayer) this.grainPlayer.start();
            this.isPlaying = true;
        }
        return this.isPlaying;
    }
}
