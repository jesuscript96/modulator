import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Square, Save, ArrowRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { interpretTurtleMelody } from '../engine/math/turtleMelody';
import { collatz, logisticMap, goldenSpiral, getFibonacciSequence } from '../engine/math/sequences';
import { RhythmPresets } from '../engine/math/lsystem';
import type { LSystemPreset } from '../engine/math/lsystem';
import type { SoundVector, LabClip } from '../types';
import TwelveToneMatrix from '../components/composer/TwelveToneMatrix';
import PianoRollVisualizer from '../components/composer/PianoRollVisualizer';
import HelpTooltip from '../components/shared/HelpTooltip';
import MathVisualizer from '../components/composer/MathVisualizer';
import DidacticComposerGuide from '../components/composer/DidacticComposerGuide';
import { CelestialPadSynth } from '../engine/CelestialPadSynth';
import { ViolinSynth } from '../engine/ViolinSynth';
import { GuitarSynth } from '../engine/GuitarSynth';

const SCALES: Record<string, { label: string; intervals: number[] }> = {
  major: { label: 'Mayor (Jónica)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Menor (Eólica)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  pentatonic: { label: 'Pentatónica Mayor', intervals: [0, 2, 4, 7, 9] },
  wholeTone: { label: 'Tonos Enteros (Debussy)', intervals: [0, 2, 4, 6, 8, 10] },
  chromatic: { label: 'Cromática', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function ComposerPage() {
  const [activeTab, setActiveTab] = useState<'dodeca' | 'collatz' | 'lsystem' | 'logistic' | 'fibonacci'>('dodeca');
  const addLabClip = useProjectStore((s) => s.addLabClip);
  const synthType = useProjectStore((s) => s.synthType);
  const synthSettings = useProjectStore((s) => s.synthSettings);
  const setSynthType = useProjectStore((s) => s.setSynthType);
  const updateSynthSettings = useProjectStore((s) => s.updateSynthSettings);
  
  // Vectors currently generated
  const [generatedVectors, setGeneratedVectors] = useState<SoundVector[]>([]);
  const [clipName, setClipName] = useState('Math Sequence');
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);

  // Preview synth state
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const previewSynthRef = useRef<Tone.PolySynth | CelestialPadSynth | ViolinSynth | GuitarSynth | null>(null);
  const previewScheduleIds = useRef<number[]>([]);

  // Setup preview synth
  useEffect(() => {
    let synth: Tone.PolySynth | CelestialPadSynth | ViolinSynth | GuitarSynth;
    let filter: Tone.Filter | null = null;
    let delay: Tone.FeedbackDelay | null = null;

    if (synthType === 'celestial') {
      synth = new CelestialPadSynth();
    } else if (synthType === 'violin') {
      synth = new ViolinSynth();
    } else if (synthType === 'guitar') {
      synth = new GuitarSynth();
    } else {
      filter = new Tone.Filter(2000, 'lowpass');
      delay = new Tone.FeedbackDelay('8n.', 0.25);
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4 },
        volume: -6,
      }).connect(filter);
      filter.connect(delay);
      delay.toDestination();
      synth = poly;
    }

    previewSynthRef.current = synth;

    return () => {
      previewScheduleIds.current.forEach((id) => Tone.Transport.clear(id));
      synth.dispose();
      if (filter) filter.dispose();
      if (delay) delay.dispose();
    };
  }, [synthType]);

  // Update preview synth parameters reactively in real-time
  useEffect(() => {
    const synth = previewSynthRef.current;
    if (!synth) return;
    if (synthType === 'celestial') {
      const celestial = synth as CelestialPadSynth;
      celestial.setBrightness(synthSettings.cutoff);
      celestial.setDetune(synthSettings.detune);
      celestial.setAttack(synthSettings.attack);
      celestial.setRelease(synthSettings.release);
    } else if (synthType === 'violin') {
      const violin = synth as ViolinSynth;
      violin.setBrightness(synthSettings.cutoff);
      violin.setDetune(synthSettings.detune);
      violin.setAttack(synthSettings.attack);
      violin.setRelease(synthSettings.release);
    } else if (synthType === 'guitar') {
      const guitar = synth as GuitarSynth;
      guitar.setBrightness(synthSettings.cutoff);
      guitar.setDetune(synthSettings.detune);
      guitar.setAttack(synthSettings.attack);
      guitar.setRelease(synthSettings.release);
    }
  }, [synthSettings, synthType]);

  // ----------------------------------------------------
  // ALGORITHM STATES
  // ----------------------------------------------------

  // Common mapping config
  const [basePitch, setBasePitch] = useState(60); // C4
  const [selectedScale, setSelectedScale] = useState('major');
  const [noteDuration, setNoteDuration] = useState(250); // ms (16th note at 120 bpm)

  // Shared Duration, Repeat & Split Config
  const [durationMode, setDurationMode] = useState<'fixed' | 'random' | 'fibonacci'>('fixed');
  const [durationMinMult, setDurationMinMult] = useState(0.25);
  const [durationMaxMult, setDurationMaxMult] = useState(2.0);
  const [durationStep, setDurationStep] = useState(0.25);
  const [pitchRepeatProb, setPitchRepeatProb] = useState(0); // 0 to 1
  const [noteSplitProb, setNoteSplitProb] = useState(0); // 0 to 1
  const [noteSplitType, setNoteSplitType] = useState<'even' | 'golden'>('even');

  // 1. Dodecaphonic Row
  const [primeRow, setPrimeRow] = useState<number[]>([0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6]);
  const [dodecaChain, setDodecaChain] = useState<Array<{ name: string; notes: number[] }>>([]);

  // 2. Collatz
  const [collatzSeed, setCollatzSeed] = useState(7);
  const [collatzSteps, setCollatzSteps] = useState(30);

  // 3. L-System Turtle
  const [lsystemPreset, setLsystemPreset] = useState<LSystemPreset>('algae');
  const [lsystemIterations, setLsystemIterations] = useState(4);
  const [lsystemInterval, setLsystemInterval] = useState(2); // semitones per +/-

  // 4. Logistic Map
  const [logisticX0, setLogisticX0] = useState(0.2);
  const [logisticR, setLogisticR] = useState(3.8); // chaotic
  const [logisticSteps, setLogisticSteps] = useState(32);

  // 5. Fibonacci / Golden Spiral
  const [fibSteps, setFibSteps] = useState(16);
  const [fibMode, setFibMode] = useState<'rhythm' | 'spiral' | 'sequence'>('spiral');
  const [fibSeqType, setFibSeqType] = useState<'standard' | 'lucas' | 'custom'>('standard');
  const [customFibSequenceStr, setCustomFibSequenceStr] = useState('1, 1, 2, 3, 5, 7, 12, 19');
  const [fibPitchMode, setFibPitchMode] = useState<'wrap' | 'cumulative' | 'scaleWrap' | 'scaleCumulative'>('cumulative');

  // Get dynamic step duration for an index based on configuration
  const getStepDuration = useCallback((index: number, baseDur: number): number => {
    if (durationMode === 'fixed') {
      return baseDur;
    }
    if (durationMode === 'random') {
      const stepsCount = Math.round((durationMaxMult - durationMinMult) / durationStep);
      const randomStep = Math.floor(Math.random() * (stepsCount + 1));
      const multiplier = durationMinMult + randomStep * durationStep;
      return Math.round(baseDur * multiplier);
    }
    if (durationMode === 'fibonacci') {
      const fibDurations = [1, 1, 2, 3, 5, 8, 13];
      const multiplier = fibDurations[index % fibDurations.length] * 0.25;
      return Math.round(baseDur * multiplier);
    }
    return baseDur;
  }, [durationMode, durationMinMult, durationMaxMult, durationStep]);

  // Map Fibonacci values to pitch intervals/octaves based on config
  const mapFibonacciToPitch = useCallback((val: number, idx: number, qPitchFn: (p: number, s: string, r: number) => number): number => {
    if (fibPitchMode === 'wrap') {
      const offset = ((val % 12) + 12) % 12;
      return basePitch + offset;
    }
    if (fibPitchMode === 'cumulative') {
      const pitch = basePitch + val;
      return Math.min(127, Math.max(12, pitch));
    }

    const scaleKey = selectedScale;
    if (fibPitchMode === 'scaleWrap') {
      const scale = SCALES[scaleKey].intervals;
      const scaleLength = scale.length;
      const scaleIndex = ((val % scaleLength) + scaleLength) % scaleLength;
      return basePitch + scale[scaleIndex];
    }
    if (fibPitchMode === 'scaleCumulative') {
      const scale = SCALES[scaleKey].intervals;
      const scaleLength = scale.length;
      const totalSteps = val;
      const octaveOffset = Math.floor(totalSteps / scaleLength);
      const scaleIndex = ((totalSteps % scaleLength) + scaleLength) % scaleLength;
      const pitch = basePitch + scale[scaleIndex] + octaveOffset * 12;
      return Math.min(127, Math.max(12, pitch));
    }
    return basePitch;
  }, [fibPitchMode, basePitch, selectedScale]);

  // Quantize a midi note to the selected scale
  const quantizePitch = useCallback((pitch: number, scaleKey: string, rootNote: number): number => {
    const scale = SCALES[scaleKey].intervals;
    const midiOffset = pitch - rootNote;
    const octave = Math.floor(midiOffset / 12);
    let noteInOctave = ((midiOffset % 12) + 12) % 12;

    // Find nearest note in scale
    let nearest = scale[0];
    let minDiff = Infinity;
    for (const val of scale) {
      const diff = Math.abs(val - noteInOctave);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = val;
      }
    }

    return rootNote + octave * 12 + nearest;
  }, []);

  // ----------------------------------------------------
  // GENERATE VECTOR MELODIES
  // ----------------------------------------------------

  const generateMelody = useCallback(() => {
    previewScheduleIds.current.forEach((id) => Tone.Transport.clear(id));
    previewScheduleIds.current = [];
    Tone.Transport.stop();
    setPreviewPlaying(false);
    setActiveNoteIdx(null);

    let vectors: SoundVector[] = [];
    const sourceId = `composer-${activeTab}-${Date.now()}`;

    if (activeTab === 'dodeca') {
      if (dodecaChain.length === 0) {
        setGeneratedVectors([]);
        return;
      }

      // Chain rows together
      let currentTime = 0;
      let noteIndex = 0;
      dodecaChain.forEach((block, blockIdx) => {
        block.notes.forEach((pitchOffset, noteIdx) => {
          // Dodecaphonic series notes are chromatic offsets added to the base pitch
          const pitch = basePitch + pitchOffset;
          const duration = getStepDuration(noteIndex, noteDuration);
          vectors.push({
            id: `dodeca-${blockIdx}-${noteIdx}-${Math.random().toString(36).slice(2, 6)}`,
            t: currentTime,
            p: pitch,
            duration: duration,
            velocity: 0.8,
            sourceId,
          });
          currentTime += duration;
          noteIndex++;
        });
      });
      setClipName(`Dodeca Series (${dodecaChain.length} rows)`);
    } 
    
    else if (activeTab === 'collatz') {
      const numbers = collatz(collatzSeed).slice(0, collatzSteps);
      let currentTime = 0;

      numbers.forEach((num, idx) => {
        // Map Collatz number to pitch
        const scale = SCALES[selectedScale].intervals;
        const scaleIndex = num % scale.length;
        const octaveOffset = Math.floor(num / scale.length) % 3; // Keep within 3 octaves
        const pitch = basePitch + scale[scaleIndex] + octaveOffset * 12;
        
        // Rhythmic mapping: even is twice as long as odd
        const durationMultiplier = num % 2 === 0 ? 2 : 1;
        const baseStepDuration = getStepDuration(idx, noteDuration);
        const duration = baseStepDuration * durationMultiplier;

        vectors.push({
          id: `collatz-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          t: currentTime,
          p: Math.min(127, Math.max(12, pitch)),
          duration: duration,
          velocity: 0.85,
          sourceId,
        });

        currentTime += duration;
      });
      setClipName(`Collatz Orbit (Seed ${collatzSeed})`);
    } 
    
    else if (activeTab === 'lsystem') {
      const system = RhythmPresets[lsystemPreset];
      const code = system.generate(lsystemIterations);
      
      // Pass list of dynamic durations
      const lsystemDurations = Array.from({ length: 1000 }, (_, i) => getStepDuration(i, noteDuration));
      
      // Interpret L-system string as a melodic turtle walk
      vectors = interpretTurtleMelody(
        code,
        basePitch,
        lsystemInterval,
        lsystemDurations,
        sourceId
      );
      setClipName(`L-System Turtle [${lsystemPreset}]`);
    } 
    
    else if (activeTab === 'logistic') {
      const values = logisticMap(logisticX0, logisticR, logisticSteps);
      let currentTime = 0;

      values.forEach((x, idx) => {
        // Scale x [0, 1] to a pitch range of 2 octaves quantized to scale
        const rawPitch = basePitch + Math.floor(x * 24);
        const pitch = quantizePitch(rawPitch, selectedScale, basePitch);
        const duration = getStepDuration(idx, noteDuration);

        vectors.push({
          id: `logistic-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          t: currentTime,
          p: pitch,
          duration: duration,
          velocity: 0.7 + x * 0.3, // Velocity follows chaos value
          sourceId,
        });

        currentTime += duration;
      });
      setClipName(`Logistic Chaos (r=${logisticR.toFixed(3)})`);
    } 
    
    else if (activeTab === 'fibonacci') {
      let currentTime = 0;
      if (fibMode === 'spiral') {
        // Golden spiral pitch generator: f_n = f_0 * phi^n
        for (let i = 0; i < fibSteps; i++) {
          const ratio = goldenSpiral(i * 0.1); // Scaled down exponent
          const rawPitch = basePitch + Math.round(12 * Math.log2(ratio));
          const pitch = quantizePitch(rawPitch, selectedScale, basePitch);
          const duration = getStepDuration(i, noteDuration);

          vectors.push({
            id: `fib-spiral-${i}-${Math.random().toString(36).slice(2, 6)}`,
            t: currentTime,
            p: Math.min(127, Math.max(12, pitch)),
            duration: duration,
            velocity: 0.8,
            sourceId,
          });
          currentTime += duration;
        }
        setClipName(`Golden Spiral Melodía`);
      } else if (fibMode === 'rhythm') {
        // Fibonacci rhythms: triggers placed at Fibonacci beat offsets
        const fibTimes = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
        
        for (let i = 0; i < fibSteps; i++) {
          const beats = fibTimes[i];
          const stepDur = getStepDuration(i, noteDuration);
          const pitch = quantizePitch(basePitch + (i * 3) % 12, selectedScale, basePitch);

          vectors.push({
            id: `fib-rhythm-${i}-${Math.random().toString(36).slice(2, 6)}`,
            t: currentTime,
            p: pitch,
            duration: stepDur * 1.5,
            velocity: 0.85,
            sourceId,
          });
          currentTime += stepDur * beats;
        }
        setClipName(`Fibonacci Rhythmics`);
      } else if (fibMode === 'sequence') {
        // Fibonacci Pitch Sequence
        const seqNumbers: number[] = [];
        if (fibSeqType === 'standard') {
          seqNumbers.push(...getFibonacciSequence(1, 1, fibSteps));
        } else if (fibSeqType === 'lucas') {
          seqNumbers.push(...getFibonacciSequence(2, 1, fibSteps));
        } else {
          // Custom
          const parsed = customFibSequenceStr
            .split(',')
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n));
          if (parsed.length > 0) {
            seqNumbers.push(...parsed.slice(0, fibSteps));
          } else {
            seqNumbers.push(...getFibonacciSequence(1, 1, fibSteps));
          }
        }

        seqNumbers.forEach((val, i) => {
          const pitch = mapFibonacciToPitch(val, i, quantizePitch);
          const duration = getStepDuration(i, noteDuration);
          vectors.push({
            id: `fib-seq-${i}-${Math.random().toString(36).slice(2, 6)}`,
            t: currentTime,
            p: pitch,
            duration: duration,
            velocity: 0.8,
            sourceId,
          });
          currentTime += duration;
        });
        setClipName(`Fibonacci Sequence Melodía`);
      }
    }

    // Apply Post-Processing (pitch repetition and subdivisions)
    const postProcessed: SoundVector[] = [];
    if (vectors.length > 0) {
      let lastPitch = vectors[0].p;
      vectors.forEach((v, idx) => {
        let pitch = v.p;
        // Pitch repeat probability
        if (idx > 0 && Math.random() < pitchRepeatProb) {
          pitch = lastPitch;
        }
        lastPitch = pitch;

        // Note split probability
        if (Math.random() < noteSplitProb) {
          if (noteSplitType === 'golden') {
            const d1 = Math.round(v.duration * 0.618);
            const d2 = v.duration - d1;
            postProcessed.push({
              ...v,
              id: `${v.id}-s1-${Math.random().toString(36).slice(2, 5)}`,
              p: pitch,
              duration: d1,
            });
            postProcessed.push({
              ...v,
              id: `${v.id}-s2-${Math.random().toString(36).slice(2, 5)}`,
              p: pitch,
              t: v.t + d1,
              duration: d2,
            });
          } else {
            const d1 = Math.round(v.duration / 2);
            const d2 = v.duration - d1;
            postProcessed.push({
              ...v,
              id: `${v.id}-s1-${Math.random().toString(36).slice(2, 5)}`,
              p: pitch,
              duration: d1,
            });
            postProcessed.push({
              ...v,
              id: `${v.id}-s2-${Math.random().toString(36).slice(2, 5)}`,
              p: pitch,
              t: v.t + d1,
              duration: d2,
            });
          }
        } else {
          postProcessed.push({
            ...v,
            p: pitch,
          });
        }
      });
    }

    setGeneratedVectors(postProcessed);
  }, [
    activeTab,
    basePitch,
    selectedScale,
    noteDuration,
    dodecaChain,
    collatzSeed,
    collatzSteps,
    lsystemPreset,
    lsystemIterations,
    lsystemInterval,
    logisticX0,
    logisticR,
    logisticSteps,
    fibSteps,
    fibMode,
    quantizePitch,
    fibSeqType,
    customFibSequenceStr,
    fibPitchMode,
    durationMode,
    durationMinMult,
    durationMaxMult,
    durationStep,
    pitchRepeatProb,
    noteSplitProb,
    noteSplitType,
    getStepDuration,
    mapFibonacciToPitch,
  ]);

  // Generate and regenerate melody on mount or when parameters change reactively
  useEffect(() => {
    generateMelody();
  }, [
    generateMelody,
    activeTab,
    basePitch,
    selectedScale,
    noteDuration,
    dodecaChain,
    collatzSeed,
    collatzSteps,
    lsystemPreset,
    lsystemIterations,
    lsystemInterval,
    logisticX0,
    logisticR,
    logisticSteps,
    fibSteps,
    fibMode,
    fibSeqType,
    customFibSequenceStr,
    fibPitchMode,
    durationMode,
    durationMinMult,
    durationMaxMult,
    durationStep,
    pitchRepeatProb,
    noteSplitProb,
    noteSplitType,
  ]);

  // ----------------------------------------------------
  // PREVIEW PLAYBACK
  // ----------------------------------------------------

  const handleTogglePreview = useCallback(async () => {
    if (previewPlaying) {
      Tone.Transport.stop();
      previewScheduleIds.current.forEach((id) => Tone.Transport.clear(id));
      previewScheduleIds.current = [];
      setPreviewPlaying(false);
      setActiveNoteIdx(null);
      return;
    }

    if (generatedVectors.length === 0) return;

    await Tone.start();
    Tone.Transport.seconds = 0; // Reset transport position to 0
    setPreviewPlaying(true);
    setActiveNoteIdx(null);

    // Schedule all vectors on Tone.Transport
    generatedVectors.forEach((v, idx) => {
      const id = Tone.Transport.schedule((time) => {
        const freq = Tone.Frequency(v.p, 'midi').toFrequency();
        previewSynthRef.current?.triggerAttackRelease(
          freq,
          v.duration / 1000,
          time,
          v.velocity
        );
        Tone.Draw.schedule(() => {
          setActiveNoteIdx(idx);
        }, time);
      }, v.t / 1000);
      previewScheduleIds.current.push(id);
    });

    // Loop support: find max time
    const maxT = Math.max(...generatedVectors.map((v) => v.t + v.duration));
    const loopId = Tone.Transport.schedule((time) => {
      // Loop stop
      Tone.Draw.schedule(() => {
        Tone.Transport.stop();
        setPreviewPlaying(false);
        setActiveNoteIdx(null);
      }, time);
    }, maxT / 1000);
    previewScheduleIds.current.push(loopId);

    Tone.Transport.start();
  }, [generatedVectors, previewPlaying]);

  // Stop transport if tab changes
  useEffect(() => {
    previewScheduleIds.current.forEach((id) => Tone.Transport.clear(id));
    previewScheduleIds.current = [];
    if (previewPlaying) {
      Tone.Transport.stop();
      setPreviewPlaying(false);
    }
    setActiveNoteIdx(null);
  }, [activeTab]);

  // ----------------------------------------------------
  // EXPORT TO LIBRARY (OFFLINE SYNTH RENDERING)
  // ----------------------------------------------------

  const handleExport = useCallback(async () => {
    if (generatedVectors.length === 0) return;
    setRendering(true);

    try {
      const maxT = Math.max(...generatedVectors.map((v) => v.t + v.duration));
      // Give a tiny buffer for releases
      const durationSeconds = maxT / 1000 + 0.5;
      const sampleRate = 44100;

      // Render the synth version of the melody to an AudioBuffer offline
      const toneBuffer = await Tone.Offline(() => {
        let synth: Tone.PolySynth | CelestialPadSynth | ViolinSynth | GuitarSynth;
        let filter: Tone.Filter | null = null;
        let delay: Tone.FeedbackDelay | null = null;

        if (synthType === 'celestial') {
          const celestial = new CelestialPadSynth();
          celestial.setBrightness(synthSettings.cutoff);
          celestial.setDetune(synthSettings.detune);
          celestial.setAttack(synthSettings.attack);
          celestial.setRelease(synthSettings.release);
          synth = celestial;
        } else if (synthType === 'violin') {
          const violin = new ViolinSynth();
          violin.setBrightness(synthSettings.cutoff);
          violin.setDetune(synthSettings.detune);
          violin.setAttack(synthSettings.attack);
          violin.setRelease(synthSettings.release);
          synth = violin;
        } else if (synthType === 'guitar') {
          const guitar = new GuitarSynth();
          guitar.setBrightness(synthSettings.cutoff);
          guitar.setDetune(synthSettings.detune);
          guitar.setAttack(synthSettings.attack);
          guitar.setRelease(synthSettings.release);
          synth = guitar;
        } else {
          filter = new Tone.Filter(2000, 'lowpass');
          delay = new Tone.FeedbackDelay('8n.', 0.25);
          const poly = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4 },
            volume: -6,
          }).connect(filter);
          filter.connect(delay);
          delay.toDestination();
          synth = poly;
        }

        generatedVectors.forEach((v) => {
          const freq = Tone.Frequency(v.p, 'midi').toFrequency();
          synth.triggerAttackRelease(
            freq,
            v.duration / 1000,
            v.t / 1000,
            v.velocity
          );
        });
      }, durationSeconds);

      const buffer = toneBuffer.get() as AudioBuffer;

      const clipId = `composer-clip-${Date.now()}`;
      const newClip: LabClip = {
        id: clipId,
        name: clipName,
        audioBuffer: buffer,
        type: 'harmonic',
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        createdAt: Date.now(),
        vectors: generatedVectors,
      };

      addLabClip(newClip);

      // Trigger standard visual alert
      alert(`Clip "${clipName}" rendered and exported to Lab Clips! Go to Sidebar to add it to the Board.`);
    } catch (err) {
      console.error(err);
      alert('Error rendering audio buffer.');
    } finally {
      setRendering(false);
    }
  }, [generatedVectors, clipName, addLabClip, synthType, synthSettings]);

  // Randomize prime row for Dodecaphonic tab
  const handleRandomizeRow = () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setPrimeRow(arr);
    setDodecaChain([]); // Reset chain
  };

  return (
    <div className="p-4 md:p-8 flex flex-col flex-grow">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-black pb-4 mb-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Math Composer</h2>
        <HelpTooltip
          title="Algorithmic Melody Composer"
          technical="Generador matemático de arreglos SoundVector[]. Produce secuencias de notas cuantizadas mediante procesos iterativos y matrices algebraicas. Renderiza a AudioBuffer en segundo plano (Tone.Offline)."
          beginner="Compón melodías usando fórmulas científicas. Puedes diseñar patrones dodecafónicos, explorar fractales de L-System, o escuchar el caos del Mapa Logístico. Luego, expórtalos al Board."
        />
        <span className="text-xs font-mono text-black/40 ml-auto">
          {generatedVectors.length} notes generated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        {/* Left column: Parameters & Config */}
        <div className="lg:col-span-4 flex flex-col gap-6 border-r border-black/10 pr-6">
          
          {/* Tab Selector */}
          <div className="flex flex-col gap-1">
            <span className="uppercase tracking-widest text-[9px] text-black/50">Mathematical Generator</span>
            <div className="flex flex-col gap-1 border border-black p-1.5 bg-[#fbfbfa]">
              {[
                { id: 'dodeca', label: '12-Tone Matrix (Modular)' },
                { id: 'collatz', label: 'Collatz Conjecture (3n+1)' },
                { id: 'lsystem', label: 'L-System Turtle (Fractal)' },
                { id: 'logistic', label: 'Logistic Map (Chaos)' },
                { id: 'fibonacci', label: 'Fibonacci / Spiral' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-left text-xs px-2.5 py-1.5 uppercase font-mono tracking-wide border transition-all ${
                    activeTab === tab.id
                      ? 'border-black bg-black text-[#f4f4f0] font-bold'
                      : 'border-transparent hover:border-black/20 hover:bg-black/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shared Mapping Config */}
          <div className="border-t border-black/10 pt-4 flex flex-col gap-3">
            <h4 className="font-bold text-[10px] uppercase tracking-widest text-black/70">Mapeo de Notas y Afinación</h4>
            
            {/* Base pitch */}
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                <span>Nota Base (Tono Central)</span>
                <span className="font-mono">{NOTE_NAMES[basePitch % 12]}${Math.floor(basePitch / 12) - 1} ({basePitch})</span>
              </span>
              <span className="text-[9px] text-black/40 leading-tight">Define la altura o afinación de partida.</span>
              <input
                type="range"
                min="36"
                max="84"
                value={basePitch}
                onChange={(e) => setBasePitch(parseInt(e.target.value))}
                className="accent-black mt-1"
              />
            </label>

            {/* Scale selection (not for dodeca, which is chromatic) */}
            {activeTab !== 'dodeca' && (
              <label className="flex flex-col gap-1 text-xs">
                <span className="uppercase tracking-widest text-[9px] text-black/50">Escala Musical (Filtro de Notas)</span>
                <span className="text-[9px] text-black/40 leading-tight mb-1">Fuerza a que las notas calculadas encajen en una escala armónica.</span>
                <select
                  className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                >
                  {Object.entries(SCALES).map(([k, s]) => (
                    <option key={k} value={k}>{s.label}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Note Duration */}
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                <span>Duración del Paso (Velocidad)</span>
                <span className="font-mono">{noteDuration} ms</span>
              </span>
              <span className="text-[9px] text-black/40 leading-tight">La duración de cada nota individual de la melodía.</span>
              <input
                type="range"
                min="60"
                max="1000"
                step="10"
                value={noteDuration}
                onChange={(e) => setNoteDuration(parseInt(e.target.value))}
                className="accent-black mt-1"
              />
            </label>

            {/* Rhythm & Modulations Section */}
            <div className="border-t border-black/10 pt-4 flex flex-col gap-3">
              <h4 className="font-bold text-[10px] uppercase tracking-widest text-black/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FF6600]" /> Ritmo y Repeticiones
              </h4>
              
              {/* Duration Mode Select */}
              <label className="flex flex-col gap-1 text-xs">
                <span className="uppercase tracking-widest text-[9px] text-black/50">Modo de Duración</span>
                <select
                  className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
                  value={durationMode}
                  onChange={(e) => setDurationMode(e.target.value as any)}
                >
                  <option value="fixed">Fijo (Estático)</option>
                  <option value="random">Aleatorio Matemático</option>
                  <option value="fibonacci">Modulación Fibonacci</option>
                </select>
              </label>

              {/* Random mode controls */}
              {durationMode === 'random' && (
                <div className="bg-[#fcfbf9] border border-black/10 p-2.5 rounded-sm flex flex-col gap-3">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-black/50">Rango y Subdivisiones</span>
                  
                  <label className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Multiplicador Mínimo</span>
                      <span className="font-mono">{durationMinMult.toFixed(2)}x ({Math.round(noteDuration * durationMinMult)} ms)</span>
                    </span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={durationMinMult}
                      onChange={(e) => setDurationMinMult(parseFloat(e.target.value))}
                      className="accent-black h-1"
                    />
                  </label>

                  <label className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Multiplicador Máximo</span>
                      <span className="font-mono">{durationMaxMult.toFixed(2)}x ({Math.round(noteDuration * durationMaxMult)} ms)</span>
                    </span>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={durationMaxMult}
                      onChange={(e) => setDurationMaxMult(parseFloat(e.target.value))}
                      className="accent-black h-1"
                    />
                  </label>

                  <label className="flex flex-col gap-0.5 text-xs">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Paso / Subdivisión</span>
                      <span className="font-mono">{durationStep.toFixed(2)}x ({Math.round(noteDuration * durationStep)} ms)</span>
                    </span>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={durationStep}
                      onChange={(e) => setDurationStep(parseFloat(e.target.value))}
                      className="accent-black h-1"
                    />
                  </label>
                </div>
              )}

              {/* Pitch repeat probability */}
              <label className="flex flex-col gap-1 text-xs">
                <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                  <span>Prob. Repetición de Nota</span>
                  <span className="font-mono">{Math.round(pitchRepeatProb * 100)}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={pitchRepeatProb}
                  onChange={(e) => setPitchRepeatProb(parseFloat(e.target.value))}
                  className="accent-black mt-1"
                />
              </label>

              {/* Note splitting probability */}
              <div className="flex flex-col gap-1.5">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Prob. Subdivisión (Split)</span>
                    <span className="font-mono">{Math.round(noteSplitProb * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={noteSplitProb}
                    onChange={(e) => setNoteSplitProb(parseFloat(e.target.value))}
                    className="accent-black mt-1"
                  />
                </label>

                {noteSplitProb > 0 && (
                  <div className="flex gap-1.5">
                    {[
                      { id: 'even', label: 'Mitades' },
                      { id: 'golden', label: 'Proporción Áurea (0.618)' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNoteSplitType(type.id as any)}
                        className={`flex-1 text-[8px] uppercase tracking-wider py-1 border transition-colors cursor-pointer ${
                          noteSplitType === type.id
                            ? 'border-black bg-black text-[#f4f4f0]'
                            : 'border-black/25 hover:border-black/50 hover:bg-black/5'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Synth Engine Selection & Parameter Control */}
            <div className="border-t border-black/10 pt-4 mt-2 flex flex-col gap-3">
              <span className="uppercase tracking-widest text-[9px] text-black/50">Synth Engine (Sonido)</span>
              <select
                className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
                value={synthType}
                onChange={(e) => setSynthType(e.target.value as any)}
              >
                <option value="triangle">Triángulo Clásico</option>
                <option value="celestial">Celestial Ambient Pad</option>
                <option value="violin">Violín Expresivo</option>
                <option value="guitar">Guitarra Acústica (Pluck)</option>
              </select>

              {synthType !== 'triangle' && (
                <div className="bg-[#f0f0eb] border border-black/15 p-3 rounded-sm flex flex-col gap-3">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-black/60 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-yellow-600 animate-pulse" /> {synthType === 'celestial' ? 'Celestial Pad Controls' : synthType === 'violin' ? 'Violin Synth Controls' : 'Guitar Synth Controls'}
                  </span>

                  {/* Cutoff (Brightness) */}
                  <label className="flex flex-col gap-0.5 text-xs cursor-pointer">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Brillo (Cutoff Filter)</span>
                      <span className="font-mono font-bold">{synthSettings.cutoff} Hz</span>
                    </span>
                    <input
                      type="range"
                      min="400"
                      max="2000"
                      step="50"
                      value={synthSettings.cutoff}
                      onChange={(e) => updateSynthSettings({ cutoff: parseInt(e.target.value) })}
                      className="accent-black mt-0.5 cursor-pointer h-1"
                    />
                  </label>

                  {/* Detune Cents */}
                  <label className="flex flex-col gap-0.5 text-xs cursor-pointer">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Chorus (Detune Osc 2)</span>
                      <span className="font-mono font-bold">+{synthSettings.detune} cents</span>
                    </span>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={synthSettings.detune}
                      onChange={(e) => updateSynthSettings({ detune: parseInt(e.target.value) })}
                      className="accent-black mt-0.5 cursor-pointer h-1"
                    />
                  </label>

                  {/* Attack */}
                  <label className="flex flex-col gap-0.5 text-xs cursor-pointer">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Ataque (Attack Envelope)</span>
                      <span className="font-mono font-bold">{synthSettings.attack.toFixed(1)}s</span>
                    </span>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={synthSettings.attack}
                      onChange={(e) => updateSynthSettings({ attack: parseFloat(e.target.value) })}
                      className="accent-black mt-0.5 cursor-pointer h-1"
                    />
                  </label>

                  {/* Release */}
                  <label className="flex flex-col gap-0.5 text-xs cursor-pointer">
                    <span className="text-[9px] text-black/50 flex justify-between">
                      <span>Relajación (Release Tail)</span>
                      <span className="font-mono font-bold">{synthSettings.release.toFixed(1)}s</span>
                    </span>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.2"
                      value={synthSettings.release}
                      onChange={(e) => updateSynthSettings({ release: parseFloat(e.target.value) })}
                      className="accent-black mt-0.5 cursor-pointer h-1"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Algorithm-Specific Config */}
          <div className="border-t border-black/10 pt-4 flex-grow flex flex-col gap-4">
            <h4 className="font-bold text-[10px] uppercase tracking-widest text-black/70">Algorithm Settings</h4>

            {/* 1. Dodecaphonic controls */}
            {activeTab === 'dodeca' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold text-black/50">Prime Row (P_0)</span>
                  <button
                    onClick={handleRandomizeRow}
                    className="text-[9px] uppercase tracking-wider font-mono border border-black/20 hover:border-black hover:bg-black hover:text-white px-2 py-1 transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Randomize
                  </button>
                </div>
                {/* Row editor (compact boxes) */}
                <div className="flex gap-0.5 border border-black/10 p-1 bg-white overflow-x-auto select-none">
                  {primeRow.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 min-w-[20px] h-8 bg-black/5 border border-black/10 flex flex-col items-center justify-center font-mono text-[9px]"
                      title={`Order: ${idx + 1}`}
                    >
                      <span className="font-bold text-black">{NOTE_NAMES[val]}</span>
                      <span className="text-[7px] text-black/40">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Current chain */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-black/50">Chained Matrix Rows</span>
                    {dodecaChain.length > 0 && (
                      <button
                        onClick={() => setDodecaChain([])}
                        className="text-[8px] uppercase tracking-wider font-mono text-[#8B0000] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="border border-dashed border-black/30 p-2 min-h-16 flex flex-wrap gap-1 items-start bg-black/[0.02]">
                    {dodecaChain.length === 0 ? (
                      <span className="text-[9px] font-mono text-black/30 uppercase m-auto text-center">
                        Row chain is empty.<br/>Click headers on the right grid to add.
                      </span>
                    ) : (
                      dodecaChain.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 text-[9px] font-mono border border-black bg-white px-1.5 py-0.5"
                        >
                          <span>{c.name.split(' ')[0]}</span>
                          <button
                            onClick={() => setDodecaChain((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-[#8B0000] hover:text-black font-bold font-sans ml-1 text-[8px]"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Collatz controls */}
            {activeTab === 'collatz' && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Seed Number (N)</span>
                    <span className="font-mono">{collatzSeed}</span>
                  </span>
                  <input
                    type="number"
                    value={collatzSeed}
                    onChange={(e) => setCollatzSeed(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-transparent border border-black/20 px-2 py-1 font-mono text-xs outline-none focus:border-black"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Maximum Note Steps</span>
                    <span className="font-mono">{collatzSteps}</span>
                  </span>
                  <input
                    type="range"
                    min="8"
                    max="100"
                    value={collatzSteps}
                    onChange={(e) => setCollatzSteps(parseInt(e.target.value))}
                    className="accent-black"
                  />
                </label>
                <button
                  onClick={generateMelody}
                  className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors"
                >
                  Regenerate Sequence
                </button>
              </div>
            )}

            {/* 3. L-System controls */}
            {activeTab === 'lsystem' && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50">L-System Rule Preset</span>
                  <select
                    className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none"
                    value={lsystemPreset}
                    onChange={(e) => setLsystemPreset(e.target.value as LSystemPreset)}
                  >
                    <option value="algae">Algae (A→AB, B→A)</option>
                    <option value="tree">Tree Branching (A→B[A]A, B→BB)</option>
                    <option value="koch">Koch Curve (A→ABBA, B→BBB)</option>
                    <option value="cantor">Cantor Set (A→A[A, [→[[[)</option>
                    <option value="thueMorse">Thue-Morse (A→AB, B→BA)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Iterations (Depth)</span>
                    <span className="font-mono">{lsystemIterations}</span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={lsystemIterations}
                    onChange={(e) => setLsystemIterations(parseInt(e.target.value))}
                    className="accent-black"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Interval Angle (Semitones)</span>
                    <span className="font-mono">{lsystemInterval} semitones (+/-)</span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={lsystemInterval}
                    onChange={(e) => setLsystemInterval(parseInt(e.target.value))}
                    className="accent-black"
                  />
                </label>
                <button
                  onClick={generateMelody}
                  className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors"
                >
                  Regenerate Sequence
                </button>
              </div>
            )}

            {/* 4. Logistic Map controls */}
            {activeTab === 'logistic' && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Initial Value (x0)</span>
                    <span className="font-mono">{logisticX0.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    value={logisticX0}
                    onChange={(e) => setLogisticX0(parseFloat(e.target.value))}
                    className="accent-black"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Growth Constant (r - Chaos Factor)</span>
                    <span className="font-mono">{logisticR.toFixed(3)}</span>
                  </span>
                  <input
                    type="range"
                    min="2.8"
                    max="4.0"
                    step="0.005"
                    value={logisticR}
                    onChange={(e) => setLogisticR(parseFloat(e.target.value))}
                    className="accent-black"
                  />
                  <span className="text-[8px] font-mono text-black/45 text-right uppercase">
                    {logisticR >= 3.57 ? 'Deterministic Chaos (r > 3.57)' : 'Stable / Periodic (r < 3.57)'}
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Length (Note Steps)</span>
                    <span className="font-mono">{logisticSteps}</span>
                  </span>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    value={logisticSteps}
                    onChange={(e) => setLogisticSteps(parseInt(e.target.value))}
                    className="accent-black"
                  />
                </label>
                <button
                  onClick={generateMelody}
                  className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors"
                >
                  Regenerate Sequence
                </button>
              </div>
            )}

            {/* 5. Fibonacci controls */}
            {activeTab === 'fibonacci' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="uppercase tracking-widest text-[9px] text-black/50">Generation Mode</span>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'spiral', label: 'Golden Spiral Pitch' },
                      { id: 'rhythm', label: 'Fibonacci Rhythms' },
                      { id: 'sequence', label: 'Secuencia de Alturas' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setFibMode(mode.id as any)}
                        className={`text-left text-[9px] px-2.5 py-1.5 uppercase font-mono tracking-wide border transition-all cursor-pointer ${
                          fibMode === mode.id
                            ? 'border-black bg-black text-[#f4f4f0]'
                            : 'border-black/25 hover:border-black/50 hover:bg-black/5'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional controls for Sequence Pitches mode */}
                {fibMode === 'sequence' && (
                  <div className="bg-[#fcfbf9] border border-black/10 p-2.5 rounded-sm flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="uppercase tracking-widest text-[9px] text-black/50">Tipo de Sucesión</span>
                      <select
                        className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
                        value={fibSeqType}
                        onChange={(e) => setFibSeqType(e.target.value as any)}
                      >
                        <option value="standard">Fibonacci Clásico (1,1,2,3,5,8...)</option>
                        <option value="lucas">Lucas (2,1,3,4,7,11...)</option>
                        <option value="custom">Serie Personalizada (Texto)</option>
                      </select>
                    </label>

                    {fibSeqType === 'custom' && (
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                          <span>Sucesión Numérica</span>
                        </span>
                        <span className="text-[8px] text-black/40 leading-none mb-1">Escribe números separados por comas.</span>
                        <input
                          type="text"
                          value={customFibSequenceStr}
                          onChange={(e) => setCustomFibSequenceStr(e.target.value)}
                          className="bg-transparent border border-black/20 px-2 py-1 font-mono text-xs outline-none focus:border-black"
                          placeholder="1, 1, 2, 3, 5, 7, 12, 19"
                        />
                      </label>
                    )}

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="uppercase tracking-widest text-[9px] text-black/50">Mapeo a la Escala</span>
                      <select
                        className="bg-transparent border border-black/20 px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
                        value={fibPitchMode}
                        onChange={(e) => setFibPitchMode(e.target.value as any)}
                      >
                        <option value="wrap">Módulo 12 (Una Octava)</option>
                        <option value="cumulative">Acumulativo (Sube Octavas)</option>
                        <option value="scaleWrap">Escala Modulo (Una Octava)</option>
                        <option value="scaleCumulative">Escala Acumulativo (Sube Octavas)</option>
                      </select>
                    </label>
                  </div>
                )}

                <label className="flex flex-col gap-1 text-xs">
                  <span className="uppercase tracking-widest text-[9px] text-black/50 flex justify-between">
                    <span>Pasos (Notas)</span>
                    <span className="font-mono">{fibSteps}</span>
                  </span>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    value={fibSteps}
                    onChange={(e) => setFibSteps(parseInt(e.target.value))}
                    className="accent-black"
                  />
                </label>
                
                <button
                  onClick={generateMelody}
                  className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors"
                >
                  Regenerate Sequence
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Interactive Visualizer & TwelveToneMatrix */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          
          {/* Main Interface block */}
          <div className="flex-grow flex flex-col border border-black p-4 bg-[#fbfbfa]">
            <h3 className="font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5">
              Interactive Grid
              <HelpTooltip
                title="Mathematics Sandbox"
                technical="Dodeca renders the Schoenberg permutation matrix. Other tabs generate coordinates on the pitch/time axes."
                beginner="En Dodecafonismo interactúas con la cuadrícula de Schoenberg. En los otros modos, visualizas directamente las notas que la ecuación genera."
              />
            </h3>

            {activeTab === 'dodeca' ? (
              <div className="flex-grow flex items-center justify-center overflow-auto py-2">
                <TwelveToneMatrix
                  primeRow={primeRow}
                  onSelectSequence={(seq) => setDodecaChain((prev) => [...prev, seq])}
                />
              </div>
            ) : (
              <div className="flex-grow flex flex-col gap-4">
                {/* Visual Math formula / graph */}
                <div className="p-3 border border-black/10 bg-black/[0.01] rounded flex items-center justify-between">
                  <div className="font-mono text-xs">
                    {activeTab === 'collatz' && (
                      <div>
                        <span className="font-bold text-black/80">Ecuación:</span>
                        <code className="bg-black/5 px-1 py-0.5 rounded ml-1 text-black">
                          f(n) = n / 2 (par) || 3n + 1 (impar)
                        </code>
                      </div>
                    )}
                    {activeTab === 'lsystem' && (
                      <div>
                        <span className="font-bold text-black/80">Reglas:</span>
                        <code className="bg-black/5 px-1 py-0.5 rounded ml-1 text-black">
                          {lsystemPreset === 'algae' && 'A → AB, B → A'}
                          {lsystemPreset === 'tree' && 'A → B[A]A, B → BB'}
                          {lsystemPreset === 'koch' && 'A → ABBA, B → BBB'}
                          {lsystemPreset === 'cantor' && 'A → A[A, [ → [[['}
                          {lsystemPreset === 'thueMorse' && 'A → AB, B → BA'}
                        </code>
                      </div>
                    )}
                    {activeTab === 'logistic' && (
                      <div>
                        <span className="font-bold text-black/80">Ecuación:</span>
                        <code className="bg-black/5 px-1 py-0.5 rounded ml-1 text-black">
                          x_n+1 = r * x_n * (1 - x_n)
                        </code>
                      </div>
                    )}
                    {activeTab === 'fibonacci' && (
                      <div>
                        <span className="font-bold text-black/80">Espiral / Serie Áurea:</span>
                        <code className="bg-black/5 px-1 py-0.5 rounded ml-1 text-black">
                          {fibMode === 'spiral' ? 'f_n = f_0 * (1.618)^n' : fibMode === 'rhythm' ? 'Time = F_n beats' : 'Pitch = F_n (mod scale)'}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-black/40 uppercase">
                    Formula Active
                  </div>
                </div>

                <MathVisualizer
                  activeTab={activeTab}
                  vectors={generatedVectors}
                  basePitch={basePitch}
                  selectedScale={selectedScale}
                  activeNoteIdx={activeNoteIdx}
                  collatzSeed={collatzSeed}
                  collatzSteps={collatzSteps}
                  lsystemPreset={lsystemPreset}
                  lsystemIterations={lsystemIterations}
                  lsystemInterval={lsystemInterval}
                  logisticX0={logisticX0}
                  logisticR={logisticR}
                  logisticSteps={logisticSteps}
                  fibSteps={fibSteps}
                  fibMode={fibMode}
                  fibSeqType={fibSeqType}
                  customFibSequenceStr={customFibSequenceStr}
                  fibPitchMode={fibPitchMode}
                />
              </div>
            )}
          </div>

          {/* Piano Roll Preview */}
          <div className="border border-black p-4 bg-[#fbfbfa] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase tracking-widest">
                Piano Roll Preview
              </h4>
              <span className="text-[9px] font-mono text-black/40">
                {generatedVectors.length > 0
                  ? `Duration: ${(Math.max(...generatedVectors.map(v => v.t + v.duration)) / 1000).toFixed(1)}s`
                  : 'Empty'}
              </span>
            </div>

            <PianoRollVisualizer vectors={generatedVectors} height={160} />

            {/* Audio Controls */}
            <div className="flex gap-2">
              <button
                onClick={handleTogglePreview}
                disabled={generatedVectors.length === 0}
                className="flex-1 border border-black py-2.5 text-xs uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                {previewPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {previewPlaying ? 'Stop Preview' : 'Listen Synth'}
              </button>

              <button
                onClick={handleExport}
                disabled={rendering || generatedVectors.length === 0}
                className="flex-1 border border-black py-2.5 text-xs uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                {rendering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {rendering ? 'Rendering...' : 'Save to Lab Clips'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <DidacticComposerGuide />
    </div>
  );
}
