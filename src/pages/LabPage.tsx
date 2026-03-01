import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AudioEngine, euclidean, applyMuteRule } from '../AudioEngine';
import type { MuteRule } from '../AudioEngine';
import { Play, Square, Upload, Save, Loader2 } from 'lucide-react';
import CircularSequencer from '../components/drums/CircularSequencer';
import HPSSeparator from '../components/spectral/HPSSeparator';
import LabClipsTray from '../components/lab/LabClipsTray';
import HelpTooltip from '../components/shared/HelpTooltip';
import helpContent from '../data/helpContent';
import { useProjectStore } from '../stores/useProjectStore';

export default function LabPage() {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [params, setParams] = useState({ grainSize: 0.1, overlap: 0.1, filterFreq: 2000, detune: 0 });
  const [mathRule, setMathRule] = useState<'none' | 'fibonacci' | 'golden' | 'noise'>('none');
  const [complexity, setComplexity] = useState(5);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [hasSample, setHasSample] = useState(false);
  const [_isEngineReady, setIsEngineReady] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState('');

  const addLabClip = useProjectStore((s) => s.addLabClip);

  const [euclideanParams, setEuclideanParams] = useState({
    kick: { k: 0, n: 16 },
    snare: { k: 0, n: 16 },
    hihat: { k: 0, n: 16 },
    perc: { k: 0, n: 16 },
  });

  const [muteRules, setMuteRules] = useState<Record<string, MuteRule>>({
    kick: 'none', snare: 'none', hihat: 'none', perc: 'none',
  });
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [isRenderingDrums, setIsRenderingDrums] = useState(false);

  const DRUM_PRESETS: Record<string, { label: string; kick: number; snare: number; hihat: number; perc: number } | null> = useMemo(() => ({
    custom: null,
    padovan: { label: 'Padovan', kick: 3, snare: 4, hihat: 7, perc: 9 },
    'primos-a': { label: 'Primos A', kick: 2, snare: 3, hihat: 5, perc: 11 },
    'primos-b': { label: 'Primos B', kick: 3, snare: 5, hihat: 11, perc: 13 },
    fibonacci: { label: 'Fibonacci', kick: 3, snare: 5, hihat: 8, perc: 13 },
    'powers-2': { label: 'Potencias de 2', kick: 2, snare: 4, hihat: 8, perc: 16 },
  }), []);

  const finalPatterns = useMemo(() => ({
    kick: applyMuteRule(euclidean(euclideanParams.kick.k, euclideanParams.kick.n), muteRules.kick),
    snare: applyMuteRule(euclidean(euclideanParams.snare.k, euclideanParams.snare.n), muteRules.snare),
    hihat: applyMuteRule(euclidean(euclideanParams.hihat.k, euclideanParams.hihat.n), muteRules.hihat),
    perc: applyMuteRule(euclidean(euclideanParams.perc.k, euclideanParams.perc.n), muteRules.perc),
  }), [euclideanParams, muteRules]);

  useEffect(() => {
    const newEngine = new AudioEngine();
    setEngine(newEngine);
    setIsEngineReady(true);

    return () => {
      newEngine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!engine) return;
    engine.onStep = setStep;
    engine.onParamChange = setParams;
    return () => {
      engine.onStep = undefined;
      engine.onParamChange = undefined;
    };
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    engine.mathRule = mathRule;
    engine.complexity = complexity;
  }, [mathRule, complexity, engine]);

  useEffect(() => {
    if (!engine) return;
    engine.setPattern('kick', finalPatterns.kick);
    engine.setPattern('snare', finalPatterns.snare);
    engine.setPattern('hihat', finalPatterns.hihat);
    engine.setPattern('perc', finalPatterns.perc);
  }, [finalPatterns, engine]);

  const handlePlay = async () => {
    if (!engine) return;
    const playing = await engine.togglePlayback();
    setIsPlaying(playing);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!engine) return;

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        await engine.loadSample(url);
        setHasSample(true);
        setFileName(file.name.replace(/\.[^/.]+$/, ''));

        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new AudioContext();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(decoded);

        const channelData = decoded.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(channelData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(channelData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }
        setWaveformData(filteredData);
      }
    },
    [engine]
  );

  const handleSaveFullClip = useCallback(() => {
    if (!audioBuffer) return;
    addLabClip({
      id: `lab-full-${Date.now()}`,
      name: `${fileName || 'sample'} [full]`,
      audioBuffer,
      type: 'full',
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      createdAt: Date.now(),
    });
  }, [audioBuffer, fileName, addLabClip]);

  const handleHPSSeparated = useCallback(
    (harmonic: AudioBuffer, percussive: AudioBuffer, _melodyFreqs: number[]) => {
      const ts = Date.now();
      const base = fileName || 'sample';
      addLabClip({
        id: `lab-harmonic-${ts}`,
        name: `${base} [harmonic]`,
        audioBuffer: harmonic,
        type: 'harmonic',
        duration: harmonic.duration,
        sampleRate: harmonic.sampleRate,
        createdAt: ts,
      });
      addLabClip({
        id: `lab-percussive-${ts}`,
        name: `${base} [percussive]`,
        audioBuffer: percussive,
        type: 'percussive',
        duration: percussive.duration,
        sampleRate: percussive.sampleRate,
        createdAt: ts + 1,
      });
    },
    [fileName, addLabClip]
  );

  const handlePresetChange = useCallback((presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = DRUM_PRESETS[presetKey];
    if (!preset) return;
    setEuclideanParams({
      kick: { k: preset.kick, n: 16 },
      snare: { k: preset.snare, n: 16 },
      hihat: { k: preset.hihat, n: 16 },
      perc: { k: preset.perc, n: 16 },
    });
  }, [DRUM_PRESETS]);

  const handleSaveDrums = useCallback(async () => {
    if (!engine) return;
    const hasAnyHits = ([finalPatterns.kick, finalPatterns.snare, finalPatterns.hihat, finalPatterns.perc] as boolean[][]).some(p => p.some(Boolean));
    if (!hasAnyHits) return;
    setIsRenderingDrums(true);
    try {
      const buffer = await engine.renderDrumPattern(2);
      const presetLabel = DRUM_PRESETS[selectedPreset]?.label ?? 'Custom';
      const rulesUsed = Object.entries(muteRules)
        .filter(([, r]) => r !== 'none')
        .map(([t, r]) => `${t}:${r}`)
        .join(' ');
      const nameParts = [`Drums [${presetLabel}]`];
      if (rulesUsed) nameParts.push(`(${rulesUsed})`);
      addLabClip({
        id: `lab-drums-${Date.now()}`,
        name: nameParts.join(' '),
        audioBuffer: buffer,
        type: 'drums',
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        createdAt: Date.now(),
      });
    } finally {
      setIsRenderingDrums(false);
    }
  }, [engine, finalPatterns, selectedPreset, muteRules, DRUM_PRESETS, addLabClip]);

  return (
    <div className="p-4 md:p-8 flex flex-col flex-grow">
      {/* Header */}
      <header className="border-b border-black pb-8 mb-8">
        <h1 className="text-[12vw] leading-[0.85] font-black tracking-tighter uppercase">
          Audio Geometria
        </h1>
        <h2 className="text-[8vw] leading-[0.85] font-bold tracking-tighter text-black/80 uppercase">
          Algorithmic Sound
        </h2>
        <h3 className="text-[6vw] leading-[0.85] font-semibold tracking-tighter text-black/60 uppercase">
          Musique Mathématique
        </h3>
      </header>

      {/* Info Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-black pb-8 mb-8 text-xs leading-relaxed">
        <div>
          <p className="font-bold mb-2">
            Internationale Zeitschrift für Grafik und verwandte Gebiete.
          </p>
          <p>
            This application explores the intersection of Euclidean geometry, mathematical
            sequences, and granular synthesis. By applying algorithms like Bjorklund's to rhythm,
            and Fibonacci to audio parameters, we generate organic, evolving soundscapes.
          </p>
        </div>
        <div>
          <p className="font-bold mb-2">Euclidean Rhythms</p>
          <p>
            The circular sequencer visualizes rhythmic patterns generated by distributing $k$ pulses
            as evenly as possible over $n$ steps. This method, discovered by Godfried Toussaint,
            generates many of the most important rhythms in world music.
          </p>
        </div>
        <div>
          <p className="font-bold mb-2">Algorithmic Modulators</p>
          <p>
            Mathematical sequences drive the parameters of the granular sampler and effects chain.
            The Fibonacci sequence controls time and grain size, the Golden Ratio dictates filter
            frequencies, and Simplex Noise introduces organic chaos.
          </p>
        </div>
        <div>
          <p className="font-bold mb-2">Instructions</p>
          <p>
            1. Drag and drop an MP3 file into the sampler.
            <br />
            2. Select a mathematical rule to modulate the audio.
            <br />
            3. Adjust the complexity slider to intensify the effect.
            <br />
            4. Modify the Euclidean parameters ($k$/16) to alter the rhythm.
            <br />
            5. Press Play.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        {/* Left: Sampler & Waveform */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div
            className="border border-black p-4 h-48 flex items-center justify-center relative overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <span className="absolute top-2 right-2 z-10">
              <HelpTooltip {...helpContent.sampler} />
            </span>
            {hasSample ? (
              <div className="w-full h-full flex items-end gap-[1px]">
                {waveformData.map((v, i) => (
                  <div
                    key={i}
                    className="bg-black w-full"
                    style={{
                      height: `${v * 100}%`,
                      opacity: i === Math.floor((step / 16) * waveformData.length) ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-sm uppercase tracking-widest">
                <Upload className="mx-auto mb-2 w-6 h-6" />
                Drop MP3 Here
              </div>
            )}
          </div>

          {/* Math Controls */}
          <div className="border-t border-black pt-4">
            <h4 className="font-bold text-sm uppercase mb-4 flex items-center gap-2">
              Algorithmic Modulators
            </h4>
            <div className="flex flex-col gap-4 text-sm">
              <label className="flex flex-col gap-2">
                <span className="uppercase tracking-widest text-xs flex items-center gap-1.5">
                  Rule
                  <HelpTooltip
                    title="Math Rules"
                    technical="Cada regla aplica una secuencia matemática distinta a los parámetros del sampler granular en cada step del secuenciador (16n)."
                    beginner="Elige qué fórmula matemática controla el sonido. Cada una produce un efecto diferente: Fibonacci lo hace orgánico, Golden Ratio lo hace armónico, Noise lo hace caótico."
                  />
                </span>
                <select
                  className="bg-transparent border border-black px-2 py-1 outline-none font-mono text-xs"
                  value={mathRule}
                  onChange={(e) => setMathRule(e.target.value as any)}
                >
                  <option value="none">None</option>
                  <option value="fibonacci">Fibonacci (Time/Grain)</option>
                  <option value="golden">Golden Ratio (Filter)</option>
                  <option value="noise">Simplex Noise (Chaos)</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="uppercase tracking-widest text-xs flex justify-between">
                  <span className="flex items-center gap-1.5">
                    Complexity
                    <HelpTooltip {...helpContent.complexity} />
                  </span>
                  <span>{complexity}</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={complexity}
                  onChange={(e) => setComplexity(parseInt(e.target.value))}
                  className="accent-black"
                />
              </label>
            </div>
          </div>

          {/* Live Params */}
          <div className="border-t border-black pt-4 text-xs font-mono flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">Grain Size: <HelpTooltip {...helpContent.grainSize} /></span>
              <span>{params.grainSize.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">Overlap: <HelpTooltip {...helpContent.overlap} /></span>
              <span>{params.overlap.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">Filter Freq: <HelpTooltip {...helpContent.filterFreq} /></span>
              <span>{params.filterFreq.toFixed(1)} Hz</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">Detune: <HelpTooltip {...helpContent.detune} /></span>
              <span>{params.detune.toFixed(1)} ct</span>
            </div>
          </div>

          {/* Save full clip */}
          {hasSample && (
            <button
              onClick={handleSaveFullClip}
              className="border border-black px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Save Full Audio to Lab
            </button>
          )}

          {/* Spectral Separation */}
          {hasSample && (
            <HPSSeparator
              audioBuffer={audioBuffer}
              onSeparated={handleHPSSeparated}
            />
          )}
        </div>

        {/* Center: Circular Sequencer */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center border-y lg:border-y-0 lg:border-x border-black py-8 lg:py-0 lg:px-4 relative">
          <span className="absolute top-2 right-2">
            <HelpTooltip {...helpContent.circularSequencer} />
          </span>
          <CircularSequencer
            step={step}
            patterns={finalPatterns}
          />
          <button
            onClick={handlePlay}
            className="mt-8 border border-black px-8 py-2 uppercase tracking-widest text-sm hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center gap-2"
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>

        {/* Right: Euclidean Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h4 className="font-bold text-sm uppercase border-b border-black pb-2 flex items-center gap-2">
            Euclidean Geometry (k/n)
            <HelpTooltip {...helpContent.euclideanRhythm} />
          </h4>

          {/* Preset selector */}
          <div className="flex flex-col gap-1">
            <span className="uppercase tracking-widest text-[10px] text-black/60">Preset</span>
            <select
              className="bg-transparent border border-black px-2 py-1.5 outline-none font-mono text-xs"
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              <option value="custom">Custom</option>
              <option value="padovan">Padovan (3, 4, 7, 9)</option>
              <option value="primos-a">Primos A (2, 3, 5, 11)</option>
              <option value="primos-b">Primos B (3, 5, 11, 13)</option>
              <option value="fibonacci">Fibonacci (3, 5, 8, 13)</option>
              <option value="powers-2">Potencias de 2 (2, 4, 8, 16)</option>
            </select>
          </div>

          {(['kick', 'snare', 'hihat', 'perc'] as const).map((track) => {
            const activeHits = finalPatterns[track].filter(Boolean).length;
            const baseHits = euclideanParams[track].k;
            const muted = baseHits - activeHits;
            return (
              <div key={track} className="flex flex-col gap-2 text-sm border-b border-black/20 pb-4">
                <div className="flex justify-between uppercase tracking-widest text-xs">
                  <span>{track}</span>
                  <span className="font-mono">
                    {euclideanParams[track].k}/16
                    {muted > 0 && (
                      <span className="text-black/40 ml-1">(-{muted})</span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={euclideanParams[track].k}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setEuclideanParams((p) => ({
                      ...p,
                      [track]: { ...p[track], k: parseInt(e.target.value) },
                    }));
                  }}
                  className="accent-black w-full"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-black/50 shrink-0">Mute</span>
                  <select
                    className="bg-transparent border border-black/30 px-1.5 py-0.5 outline-none font-mono text-[10px] flex-1"
                    value={muteRules[track]}
                    onChange={(e) =>
                      setMuteRules((prev) => ({ ...prev, [track]: e.target.value as MuteRule }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="golden">φ Golden Ratio</option>
                    <option value="fibonacci">Fibonacci</option>
                    <option value="goldenNoise">Golden Noise</option>
                  </select>
                </div>
              </div>
            );
          })}

          {/* Save drums */}
          <button
            onClick={handleSaveDrums}
            disabled={isRenderingDrums || !([finalPatterns.kick, finalPatterns.snare, finalPatterns.hihat, finalPatterns.perc] as boolean[][]).some(p => p.some(Boolean))}
            className="border border-black px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            {isRenderingDrums ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isRenderingDrums ? 'Rendering...' : 'Save Drums to Lab'}
          </button>
        </div>
      </div>

      {/* Lab Clips Tray */}
      <LabClipsTray />
    </div>
  );
}
