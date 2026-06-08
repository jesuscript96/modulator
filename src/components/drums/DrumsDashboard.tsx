import React, { useState, useEffect, useRef } from 'react';
import { useDrumsStore } from '../../stores/useDrumsStore';
import type { DrumTrackKey } from '../../stores/useDrumsStore';
import { DrumsAudioEngine } from '../../engine/modular/DrumsAudioEngine';
import DrumsKnob from './DrumsKnob';
import { Play, Square, Sliders, RefreshCw, LayoutGrid, HelpCircle, Trash2, ArrowRight } from 'lucide-react';
import HelpTooltip from '../shared/HelpTooltip';
import * as Tone from 'tone';

const TRACK_LABELS: Record<DrumTrackKey, string> = {
  bd: 'BASS DRUM (BD)',
  sd: 'SNARE DRUM (SD)',
  ch: 'CLOSED HAT (CH)',
  oh: 'OPEN HAT (OH)',
  cp: 'HAND CLAP (CP)',
  cb: 'COWBELL (CB)',
};

const TRACK_COLORS: Record<DrumTrackKey, string> = {
  bd: '#10b981', // emerald
  sd: '#f59e0b', // amber
  ch: '#0ea5e9', // sky
  oh: '#3b82f6', // blue
  cp: '#d946ef', // fuchsia
  cb: '#a855f7', // purple
};

export default function DrumsDashboard() {
  const store = useDrumsStore();
  const [engine, setEngine] = useState<DrumsAudioEngine | null>(null);
  
  // Math Generator parameters state
  const [genTrack, setGenTrack] = useState<DrumTrackKey>('bd');
  const [genAlgo, setGenAlgo] = useState<string>('euclidean');
  const [genParams, setGenParams] = useState({ k: 5, n: 16, rot: 0, seed: 0.5, threshold: 0.5 });

  const circleCanvasRef = useRef<HTMLCanvasElement>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize engine
  useEffect(() => {
    const newEngine = new DrumsAudioEngine();
    setEngine(newEngine);
    return () => {
      newEngine.dispose();
    };
  }, []);

  const handlePlayToggle = async () => {
    if (!engine) return;
    await engine.togglePlayback();
  };

  // 1. Draw Circular concentric sequencer
  useEffect(() => {
    const canvas = circleCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);
    const cx = width / 2;
    const cy = height / 2;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI * 2) / 16;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * 160, cy + Math.sin(angle) * 160);
        ctx.stroke();
      }

      // Draw concentric tracks
      const tracks: DrumTrackKey[] = ['bd', 'sd', 'ch', 'oh', 'cp', 'cb'];
      tracks.forEach((track, trackIdx) => {
        const r = 40 + trackIdx * 20; // Radius
        const color = TRACK_COLORS[track];

        // Draw track base circle
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Draw step nodes
        for (let i = 0; i < 16; i++) {
          const stepAngle = (i * Math.PI * 2) / 16 - Math.PI / 2; // Offset by -90deg to start at top
          const nx = cx + Math.cos(stepAngle) * r;
          const ny = cy + Math.sin(stepAngle) * r;
          const isActive = store.patterns[track][i];

          ctx.fillStyle = isActive ? color : 'rgba(0, 0, 0, 0.15)';
          ctx.beginPath();
          ctx.arc(nx, ny, isActive ? 4.5 : 2, 0, Math.PI * 2);
          ctx.fill();

          if (isActive) {
            // Draw visual pulse glow if this node is currently being played
            const isPlayingStep = store.isPlaying && store.currentStep === i;
            if (isPlayingStep) {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(nx, ny, 10, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      });

      // Draw sweeping playhead line (radar)
      if (store.isPlaying) {
        // We start sweeping from -90 degrees (top)
        const currentAngle = (store.currentStep * Math.PI * 2) / 16 - Math.PI / 2;
        ctx.strokeStyle = 'rgba(255, 0, 119, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(currentAngle) * 155, cy + Math.sin(currentAngle) * 155);
        ctx.stroke();

        // Center spinning node
        ctx.fillStyle = '#ff0077';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw static playhead pointer at top
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - 150);
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [store.patterns, store.isPlaying, store.currentStep]);

  // 2. Draw Oscilloscope wave
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);

    const draw = () => {
      ctx.fillStyle = '#fcfcf9';
      ctx.fillRect(0, 0, width, height);

      // Grid reference lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
      ctx.moveTo(0, height / 4); ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4); ctx.lineTo(width, (height * 3) / 4);
      ctx.stroke();

      for (let x = 30; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw real-time waveform if audio is running
      if (engine.analyser) {
        const waveform = engine.analyser.getValue() as Float32Array;
        ctx.strokeStyle = '#111111'; // Crisp Black wave
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const sliceWidth = width / waveform.length;
        let x = 0;
        for (let i = 0; i < waveform.length; i++) {
          const v = waveform[i]; // Value is [-1..1]
          const y = (v + 1) * (height / 2);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      // Draw CV Modulator value if active
      const cvVal = engine.getOutputs()['lfo_cv'] ?? 0;
      ctx.fillStyle = '#ff0077'; // Radar Pink for LFO CV
      ctx.beginPath();
      ctx.arc(12, height - 12, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.font = '8px monospace';
      ctx.fillText(`CV: ${cvVal.toFixed(2)}`, 22, height - 9);

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine]);

  const runMathPatternGenerator = () => {
    store.generateMathPattern(genTrack, genAlgo, genParams);
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 bg-[#f4f4f0] text-neutral-800 overflow-auto font-mono text-xs select-none">
      
      {/* 1. Header Toolbar */}
      <header className="border-b border-black bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_2px_0px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 text-neutral-900">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
            Visual Drums Workstation
            <HelpTooltip
              title="Estación de Percusión Algorítmica"
              technical="Estación de diseño de ritmos pre-conectada. Integra modelos físicos de síntesis, un secuenciador concéntrico en canvas, y moduladores LFO de voltaje controlable en cascada."
              beginner="Crea y modula ritmos percusivos usando matemáticas. Puedes pintar golpes a mano o generarlos con algoritmos e inmediatamente verlos reproducirse en círculos temporales."
            />
          </h2>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-600 uppercase">Tempo:</span>
            <input
              type="range"
              min="40"
              max="240"
              value={store.bpm}
              onChange={(e) => store.setBpm(parseInt(e.target.value))}
              className="accent-black w-24 h-1 bg-neutral-300 cursor-pointer"
            />
            <span className="font-bold text-emerald-600 w-8 text-right">{store.bpm}</span>
          </div>

          <button
            onClick={handlePlayToggle}
            className="border border-black bg-white hover:bg-black hover:text-white px-5 py-1.5 flex items-center gap-1.5 uppercase transition-all rounded-xs text-[10px] tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            {store.isPlaying ? <Square className="w-3.5 h-3.5 text-red-500 fill-red-500" /> : <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />}
            {store.isPlaying ? 'Pause' : 'Start Beat'}
          </button>

          <button
            onClick={() => store.clearAll()}
            className="border border-black bg-white text-neutral-700 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1 px-3 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
            title="Clear all steps"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </header>

      {/* 2. Top Section: Concentric Visualizer & Math Generators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-black bg-[#ebebe7] shrink-0">
        
        {/* Left: Concentric Sequencer Canvas */}
        <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-black flex flex-col items-center justify-center relative">
          <span className="absolute top-2 left-3 text-[9px] text-neutral-600 font-bold uppercase tracking-wider">
            Concentric Step Radar / Visualizador Circular
          </span>
          <div className="w-72 h-72 relative">
            <canvas ref={circleCanvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Right: Math Pattern Generator panel */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-center">
          <span className="text-[9px] text-neutral-750 font-bold uppercase tracking-wider mb-4 block">
            Mathematical Pattern Generator / Generador de Patrones Matemáticos
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {/* 1. Track Select */}
            <label className="flex flex-col gap-1 text-[10px] text-neutral-700 font-bold">
              <span>TARGET DRUM TRACK</span>
              <select
                className="bg-white border border-black p-2 text-xs outline-none text-emerald-600 font-bold mt-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                value={genTrack}
                onChange={(e) => setGenTrack(e.target.value as DrumTrackKey)}
              >
                {Object.entries(TRACK_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>

            {/* 2. Algorithm Select */}
            <label className="flex flex-col gap-1 text-[10px] text-neutral-700 font-bold">
              <span>ALGORITHM</span>
              <select
                className="bg-white border border-black p-2 text-xs outline-none text-sky-600 font-bold mt-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                value={genAlgo}
                onChange={(e) => setGenAlgo(e.target.value)}
              >
                <option value="euclidean">Euclidean Rhythm</option>
                <option value="fibonacci">Fibonacci Sequence</option>
                <option value="primes">Prime Indices</option>
                <option value="logistic">Logistic Map (Chaos)</option>
                <option value="padovan">Padovan Sequence</option>
              </select>
            </label>

            {/* 3. Preset Beats */}
            <label className="flex flex-col gap-1 text-[10px] text-neutral-700 font-bold">
              <span>PRESET WORKSTATION PATCHES</span>
              <select
                className="bg-white border border-black p-2 text-xs outline-none text-fuchsia-600 font-bold mt-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                onChange={(e) => store.loadPreset(e.target.value as any)}
                defaultValue="basic"
              >
                <option value="basic">Standard House/Techo Beat</option>
                <option value="euclidean">Euclidean Poly-groove</option>
                <option value="fibonacci">Fibonacci Geometric Beat</option>
                <option value="chaos">Chaotic Logistic Beat</option>
              </select>
            </label>
          </div>

          {/* Parameters for the selected Algorithm */}
          <div className="bg-white p-4 border border-black rounded-xs mb-5 min-h-[90px] flex items-center justify-between gap-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            
            {genAlgo === 'euclidean' && (
              <div className="grid grid-cols-3 gap-6 flex-grow">
                <DrumsKnob
                  label="Pulses (k)"
                  value={genParams.k}
                  min={0}
                  max={16}
                  step={1}
                  onChange={(val) => setGenParams(p => ({ ...p, k: val }))}
                />
                <DrumsKnob
                  label="Steps (n)"
                  value={genParams.n}
                  min={1}
                  max={16}
                  step={1}
                  onChange={(val) => setGenParams(p => ({ ...p, n: val }))}
                />
                <DrumsKnob
                  label="Rotate Offset"
                  value={genParams.rot}
                  min={0}
                  max={15}
                  step={1}
                  onChange={(val) => setGenParams(p => ({ ...p, rot: val }))}
                />
              </div>
            )}

            {genAlgo === 'logistic' && (
              <div className="grid grid-cols-2 gap-6 flex-grow justify-items-center">
                <DrumsKnob
                  label="Seed Val"
                  value={genParams.seed}
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  onChange={(val) => setGenParams(p => ({ ...p, seed: val }))}
                />
                <DrumsKnob
                  label="Threshold"
                  value={genParams.threshold}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  onChange={(val) => setGenParams(p => ({ ...p, threshold: val }))}
                />
              </div>
            )}

            {['fibonacci', 'primes', 'padovan'].includes(genAlgo) && (
              <div className="text-xs text-neutral-600 leading-relaxed flex-grow">
                {genAlgo === 'fibonacci' && 'La Sucesión de Fibonacci (1, 1, 2, 3, 5, 8, 13) se mapea directamente sobre los pasos de disparo. Genera patrones rítmicos estructurados y en espiral.'}
                {genAlgo === 'primes' && 'Los números primos (2, 3, 5, 7, 11, 13) indican en qué pasos ocurre una percusión. Crea una distribución asíncrona pero matemáticamente estable.'}
                {genAlgo === 'padovan' && 'La secuencia de Padovan es una recurrencia lineal (P_n = P_{n-2} + P_{n-3}) que divide el tiempo geométricamente de forma similar al número áureo.'}
              </div>
            )}

            <button
              onClick={runMathPatternGenerator}
              className="bg-black text-[#f4f4f0] border border-black hover:bg-neutral-800 px-5 py-3 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 shrink-0 rounded-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              Apply to Track <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Linear Step Sequencer Grid */}
      <div className="bg-[#fcfcf9] border-b border-black px-6 py-5 shrink-0">
        <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider mb-3 block">
          Linear Step Matrix / Matriz de Pasos Lineal
        </span>

        <div className="flex flex-col gap-2 bg-[#eaeae6] p-3 rounded border border-black">
          {(['bd', 'sd', 'ch', 'oh', 'cp', 'cb'] as DrumTrackKey[]).map((track) => {
            const isPlayingStep = store.isPlaying;
            return (
              <div key={track} className="flex items-center gap-3">
                <span 
                  className="w-24 text-[9px] font-bold truncate uppercase tracking-wider text-right"
                  style={{ color: TRACK_COLORS[track] }}
                >
                  {track.toUpperCase()}
                </span>
                
                <div className="flex gap-[4px] flex-grow">
                  {store.patterns[track].map((isSet, stepIdx) => {
                    const isBeat = stepIdx % 4 === 0;
                    const isPlayhead = isPlayingStep && store.currentStep === stepIdx;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => store.toggleStep(track, stepIdx)}
                        className={`w-full h-6 border transition-all rounded-sm flex items-center justify-center cursor-pointer`}
                        style={{
                          backgroundColor: isSet 
                            ? TRACK_COLORS[track] 
                            : isPlayhead
                              ? 'rgba(255, 0, 119, 0.15)' 
                              : isBeat 
                                ? '#d2d2cd' 
                                : '#ffffff',
                          borderColor: isPlayhead 
                            ? '#ff0077' 
                            : isSet 
                              ? 'rgba(0,0,0,0.35)' 
                              : isBeat 
                                ? '#b5b5b0' 
                                : '#d2d2cd',
                        }}
                      >
                        {isPlayhead && <div className={`w-1.5 h-1.5 rounded-full ${isSet ? 'bg-white' : 'bg-black'}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Section: Fixed Eurorack Panel Rack */}
      <div className="bg-[#eaeae6] p-6 shrink-0 border-t border-black flex gap-6 overflow-x-auto min-h-[360px]">
        
        {/* Module 1: BD-1 Kick PANEL */}
        <div className="w-56 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-emerald-400">BD-1 BASS DRUM</span>
          </div>
          <div className="p-3.5 flex flex-col gap-4 flex-grow justify-center">
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              <DrumsKnob
                label="Pitch"
                value={store.synthParams.bd.pitch}
                min={36}
                max={68}
                step={1}
                unit=" midi"
                onChange={(val) => store.updateSynthParam('bd', 'pitch', val)}
              />
              <DrumsKnob
                label="Decay"
                value={store.synthParams.bd.decay}
                min={0.1}
                max={1.2}
                step={0.05}
                unit=" s"
                onChange={(val) => store.updateSynthParam('bd', 'decay', val)}
              />
              <DrumsKnob
                label="Click"
                value={store.synthParams.bd.click}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => store.updateSynthParam('bd', 'click', val)}
              />
              <DrumsKnob
                label="Drive"
                value={store.synthParams.bd.drive}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => store.updateSynthParam('bd', 'drive', val)}
              />
            </div>

            {/* Modulation Matrix Assign */}
            <div className="border-t border-neutral-200 pt-2 flex flex-col gap-1.5 text-[8px] tracking-wider text-neutral-600">
              <span className="font-bold uppercase text-neutral-700">CV Modulation Matrix</span>
              <div className="flex justify-between items-center gap-1.5">
                <span>Pitch CV:</span>
                <select 
                  className="bg-white border border-black text-[8px] text-neutral-800 font-bold shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  value={store.modulations['bd_pitch']?.source ?? 'none'}
                  onChange={(e) => store.updateModulation('bd_pitch', e.target.value as any, store.modulations['bd_pitch']?.depth ?? 0.5)}
                >
                  <option value="none">None</option>
                  <option value="lfo">Math LFO</option>
                </select>
                <input 
                  type="range" min={0} max={1.0} step={0.05} 
                  value={store.modulations['bd_pitch']?.depth ?? 0.5} 
                  onChange={(e) => store.updateModulation('bd_pitch', store.modulations['bd_pitch']?.source ?? 'none', parseFloat(e.target.value))}
                  className="w-12 h-1 accent-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: SD-1 Snare PANEL */}
        <div className="w-56 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-amber-500">SD-1 SNARE DRUM</span>
          </div>
          <div className="p-3.5 flex flex-col gap-4 flex-grow justify-center">
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              <DrumsKnob
                label="Tone"
                value={store.synthParams.sd.tone}
                min={100}
                max={300}
                step={5}
                unit=" hz"
                onChange={(val) => store.updateSynthParam('sd', 'tone', val)}
              />
              <DrumsKnob
                label="Decay"
                value={store.synthParams.sd.decay}
                min={0.05}
                max={0.7}
                step={0.05}
                unit=" s"
                onChange={(val) => store.updateSynthParam('sd', 'decay', val)}
              />
              <DrumsKnob
                label="Snappy"
                value={store.synthParams.sd.snappy}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => store.updateSynthParam('sd', 'snappy', val)}
              />
              <DrumsKnob
                label="Filter"
                value={store.synthParams.sd.cutoff}
                min={600}
                max={4000}
                step={100}
                unit=" hz"
                onChange={(val) => store.updateSynthParam('sd', 'cutoff', val)}
              />
            </div>

            {/* Modulation Matrix Assign */}
            <div className="border-t border-neutral-200 pt-2 flex flex-col gap-1.5 text-[8px] tracking-wider text-neutral-600">
              <span className="font-bold uppercase text-neutral-700">CV Modulation Matrix</span>
              <div className="flex justify-between items-center gap-1.5">
                <span>Decay CV:</span>
                <select 
                  className="bg-white border border-black text-[8px] text-neutral-800 font-bold shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  value={store.modulations['sd_decay']?.source ?? 'none'}
                  onChange={(e) => store.updateModulation('sd_decay', e.target.value as any, store.modulations['sd_decay']?.depth ?? 0.5)}
                >
                  <option value="none">None</option>
                  <option value="lfo">Math LFO</option>
                </select>
                <input 
                  type="range" min={0} max={1.0} step={0.05} 
                  value={store.modulations['sd_decay']?.depth ?? 0.5} 
                  onChange={(e) => store.updateModulation('sd_decay', store.modulations['sd_decay']?.source ?? 'none', parseFloat(e.target.value))}
                  className="w-12 h-1 accent-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module 3: HH-1 Hihat PANEL */}
        <div className="w-56 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-sky-400">HH-1 HI-HAT</span>
          </div>
          <div className="p-3.5 flex flex-col gap-4 flex-grow justify-center">
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              <DrumsKnob
                label="Closed Dec"
                value={store.synthParams.ch.decay}
                min={0.02}
                max={0.25}
                step={0.01}
                unit=" s"
                onChange={(val) => store.updateSynthParam('ch', 'decay', val)}
              />
              <DrumsKnob
                label="Open Dec"
                value={store.synthParams.oh.decay}
                min={0.1}
                max={0.9}
                step={0.05}
                unit=" s"
                onChange={(val) => store.updateSynthParam('oh', 'decay', val)}
              />
              <div className="col-span-2">
                <DrumsKnob
                  label="Filter Tone"
                  value={store.synthParams.ch.tone}
                  min={5000}
                  max={11000}
                  step={200}
                  unit=" hz"
                  onChange={(val) => {
                    store.updateSynthParam('ch', 'tone', val);
                    store.updateSynthParam('oh', 'tone', val);
                  }}
                />
              </div>
            </div>

            {/* Modulation Matrix Assign */}
            <div className="border-t border-neutral-200 pt-2 flex flex-col gap-1.5 text-[8px] tracking-wider text-neutral-600">
              <span className="font-bold uppercase text-neutral-700">CV Modulation Matrix</span>
              <div className="flex justify-between items-center gap-1.5">
                <span>ClosedDec CV:</span>
                <select 
                  className="bg-white border border-black text-[8px] text-neutral-800 font-bold shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  value={store.modulations['ch_decay']?.source ?? 'none'}
                  onChange={(e) => store.updateModulation('ch_decay', e.target.value as any, store.modulations['ch_decay']?.depth ?? 0.5)}
                >
                  <option value="none">None</option>
                  <option value="lfo">Math LFO</option>
                </select>
                <input 
                  type="range" min={0} max={1.0} step={0.05} 
                  value={store.modulations['ch_decay']?.depth ?? 0.5} 
                  onChange={(e) => store.updateModulation('ch_decay', store.modulations['ch_decay']?.source ?? 'none', parseFloat(e.target.value))}
                  className="w-12 h-1 accent-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module 4: CP-1 Clap PANEL */}
        <div className="w-44 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-fuchsia-500">CP-1 CLAP</span>
          </div>
          <div className="p-3.5 flex flex-col gap-4 flex-grow justify-center">
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              <DrumsKnob
                label="Decay"
                value={store.synthParams.cp.decay}
                min={0.05}
                max={0.5}
                step={0.02}
                unit=" s"
                onChange={(val) => store.updateSynthParam('cp', 'decay', val)}
              />
              <DrumsKnob
                label="Filter"
                value={store.synthParams.cp.filter}
                min={800}
                max={2500}
                step={50}
                unit=" hz"
                onChange={(val) => store.updateSynthParam('cp', 'filter', val)}
              />
              <div className="col-span-2">
                <DrumsKnob
                  label="Reflection density"
                  value={store.synthParams.cp.density}
                  min={2}
                  max={6}
                  step={1}
                  onChange={(val) => store.updateSynthParam('cp', 'density', val)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module 5: CB-1 Cowbell PANEL */}
        <div className="w-44 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-purple-500">CB-1 COWBELL</span>
          </div>
          <div className="p-3.5 flex flex-col gap-4 flex-grow justify-center">
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              <DrumsKnob
                label="Pitch"
                value={store.synthParams.cb.pitch}
                min={52}
                max={80}
                step={1}
                unit=" mid"
                onChange={(val) => store.updateSynthParam('cb', 'pitch', val)}
              />
              <DrumsKnob
                label="Decay"
                value={store.synthParams.cb.decay}
                min={0.05}
                max={0.6}
                step={0.05}
                unit=" s"
                onChange={(val) => store.updateSynthParam('cb', 'decay', val)}
              />
            </div>
          </div>
        </div>

        {/* Module 6: Math LFO Modulator PANEL */}
        <div className="w-56 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-indigo-400">MATH MODULATOR (LFO)</span>
          </div>
          <div className="p-3 flex flex-col gap-3 flex-grow justify-center">
            <label className="flex flex-col gap-0.5 text-[8px] text-neutral-700">
              <span>SEQUENCE RULE</span>
              <select
                className="bg-white border border-black p-1 text-[9px] outline-none text-indigo-700 font-bold rounded-xs shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                value={store.lfoParams.type}
                onChange={(e) => store.updateLfoParam('type', parseInt(e.target.value))}
              >
                <option value={0}>Fibonacci</option>
                <option value={1}>Golden Spiral (φ)</option>
                <option value={2}>Padovan Series</option>
                <option value={3}>Primes</option>
                <option value={4}>Collatz (3n+1)</option>
                <option value={5}>Logistic Map (Chaos)</option>
                <option value={6}>Simplex Noise 1D</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 justify-items-center mt-1">
              <DrumsKnob
                label="Complexity"
                value={store.lfoParams.complexity}
                min={1}
                max={20}
                step={1}
                onChange={(val) => store.updateLfoParam('complexity', val)}
              />
              <DrumsKnob
                label="LFO Att."
                value={store.lfoParams.attenuation}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => store.updateLfoParam('attenuation', val)}
              />
            </div>
          </div>
        </div>

        {/* Module 7: MIXER PANEL */}
        <div className="w-72 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-purple-400">MIXER 6CH</span>
          </div>
          <div className="p-2.5 flex flex-col gap-1.5 flex-grow justify-center text-[9px]">
            {(['bd', 'sd', 'ch', 'oh', 'cp', 'cb'] as DrumTrackKey[]).map((track) => {
              const vol = store.mixerParams[`vol_${track}`] ?? -6;
              const pan = store.mixerParams[`pan_${track}`] ?? 0;
              const isMuted = store.mixerParams[`mute_${track}`] === 1;

              return (
                <div key={track} className="flex items-center gap-2 border-b border-neutral-200 pb-1 last:border-0 last:pb-0">
                  <span className="w-5 font-bold uppercase text-[10px]" style={{ color: TRACK_COLORS[track] }}>{track}</span>
                  <input
                    type="range"
                    min={-30}
                    max={6}
                    step={1}
                    value={vol}
                    onChange={(e) => store.updateMixerParam(`vol_${track}`, parseInt(e.target.value))}
                    className="accent-black w-20 h-1 bg-neutral-200 cursor-pointer border border-neutral-400 rounded-lg"
                  />
                  <DrumsKnob
                    label="Pan"
                    value={pan}
                    min={-1.0}
                    max={1.0}
                    step={0.1}
                    onChange={(val) => store.updateMixerParam(`pan_${track}`, val)}
                  />
                  <button
                    onClick={() => store.updateMixerParam(`mute_${track}`, isMuted ? 0 : 1)}
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded-xs border transition-all cursor-pointer ${
                      isMuted 
                        ? 'bg-red-600 border-black text-white' 
                        : 'bg-white border-black text-neutral-700 hover:bg-neutral-100 shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    M
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 8: SCOPE / OUTPUT PANEL */}
        <div className="w-64 bg-white border-2 border-black rounded flex flex-col shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 text-neutral-850">
          <div className="bg-black px-3 py-1.5 text-[8px] font-bold tracking-widest border-b border-black flex items-center justify-between">
            <span className="text-zinc-400">SCOPE / OUTPUT</span>
          </div>
          <div className="p-3 flex flex-col gap-2.5 flex-grow justify-center">
            <div className="border border-black rounded-sm overflow-hidden bg-white h-28 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <canvas ref={scopeCanvasRef} className="w-full h-full block" />
            </div>
            <div className="flex justify-between items-center text-[8px] text-neutral-600 px-1">
              <span>OUTPUT: ON (Pre-wired)</span>
              <span className="text-emerald-600 animate-pulse">44.1kHz</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
