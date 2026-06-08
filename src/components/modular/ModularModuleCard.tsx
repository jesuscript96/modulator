import React, { useRef, useEffect, useState } from 'react';
import type { ModularModule, ModularJack } from '../../types';
import { useModularStore } from '../../stores/useModularStore';
import ModularKnob from './ModularKnob';
import ModularPort from './ModularPort';
import { Trash2 } from 'lucide-react';
import { ModularAudioEngine } from '../../engine/modular/ModularAudioEngine';

interface ModularModuleCardProps {
  key?: React.Key;
  module: ModularModule;
  engine: ModularAudioEngine | null;
  dragStartPort: string | null;
  setDragStartPort: (portId: string | null) => void;
  onDragPortEnd: (portId: string) => void;
}

export default function ModularModuleCard({
  module,
  engine,
  dragStartPort,
  setDragStartPort,
  onDragPortEnd,
}: ModularModuleCardProps) {
  const updateModuleParams = useModularStore((s) => s.updateModuleParams);
  const updateModuleScript = useModularStore((s) => s.updateModuleScript);
  const removeModule = useModularStore((s) => s.removeModule);
  const cables = useModularStore((s) => s.cables);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; mx: number; my: number } | null>(null);

  // Real-time canvas drawing for Scope
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Drag handler for moving the module panel
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('textarea')) {
      return; // Ignore inputs
    }
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      mx: module.x,
      my: module.y,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    // Snap to a grid of 10px for alignment
    const grid = 10;
    const newX = Math.round((dragStartRef.current.mx + dx) / grid) * grid;
    const newY = Math.round((dragStartRef.current.my + dy) / grid) * grid;

    useModularStore.setState({
      modules: useModularStore.getState().modules.map((m) =>
        m.id === module.id ? { ...m, x: Math.max(0, newX), y: Math.max(0, newY) } : m
      ),
    });
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Check if a specific port is connected to any cable
  const isPortPatched = (portId: string) => {
    return cables.some((c) => c.fromPortId === portId || c.toPortId === portId);
  };

  // 2. Real-time Scope render loop
  useEffect(() => {
    if (module.type !== 'scope' || !canvasRef.current || !engine) return;

    let active = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Buffer for CV signals history
    const cvHistory: number[] = new Array(width).fill(0.5);

    const draw = () => {
      if (!active) return;

      ctx.fillStyle = '#fdfdfc';
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal reference lines (Brutalist blueprint style)
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
      ctx.moveTo(0, height / 4); ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4); ctx.lineTo(width, (height * 3) / 4);
      ctx.stroke();

      // Check connections
      const isAudioConnected = isPortPatched(`${module.id}-input-audio`);
      const isCvConnected = isPortPatched(`${module.id}-input-cv`);

      if (isAudioConnected && engine.analyser) {
        // Render raw audio oscilloscope
        const waveform = engine.analyser.getValue() as Float32Array;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const sliceWidth = width / waveform.length;
        let x = 0;
        for (let i = 0; i < waveform.length; i++) {
          const v = waveform[i]; // Value is between -1 and 1
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

      if (isCvConnected) {
        // Fetch last CV output value from the engine
        // Find which port is connected to the CV input of this scope
        const incomingCable = cables.find(c => c.toPortId === `${module.id}-input-cv`);
        let cvVal = 0.5;
        if (incomingCable) {
          cvVal = engine.getOutputs()[incomingCable.fromPortId] ?? 0.5;
        }

        // Shift CV history
        cvHistory.shift();
        cvHistory.push(cvVal);

        // Draw CV green line
        ctx.strokeStyle = '#00bb66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < cvHistory.length; i++) {
          const val = cvHistory[i];
          const x = i;
          const y = height - val * height;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // If nothing is connected, display standard flat line
      if (!isAudioConnected && !isCvConnected) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', width / 2, height / 2 - 6);
      }

      requestAnimationFrame(draw);
    };

    draw();

    return () => {
      active = false;
    };
  }, [module.type, engine, cables]);

  return (
    <div
      ref={cardRef}
      style={{
        transform: `translate3d(${module.x}px, ${module.y}px, 0)`,
        position: 'absolute',
      }}
      className="w-64 border border-black bg-white select-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow duration-100 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-48 z-20"
    >
      {/* Title bar / Drag Handle */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="bg-black text-white px-3 py-1.5 flex items-center justify-between cursor-move text-[10px] font-mono font-bold tracking-wider uppercase border-b border-black"
      >
        <span>{module.name}</span>
        <button
          onClick={() => removeModule(module.id)}
          className="text-white/60 hover:text-red-400 transition-colors"
          title="Remove module"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Module Workspace */}
      <div className="p-3 flex-grow flex flex-col gap-4 text-xs font-mono">
        
        {/* MODULATOR MODULE */}
        {module.type === 'modulator' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[8px] uppercase tracking-wider text-black/40">Sequence Mode</span>
              <select
                className="bg-transparent border border-black px-2 py-1 outline-none font-mono text-[10px] cursor-pointer"
                value={module.params.type ?? 0}
                onChange={(e) => updateModuleParams(module.id, { type: parseInt(e.target.value) })}
              >
                <option value={0}>Fibonacci</option>
                <option value={1}>Golden Ratio</option>
                <option value={2}>Padovan</option>
                <option value={3}>Primes</option>
                <option value={4}>Mandelbrot</option>
                <option value={5}>L-System</option>
                <option value={6}>Collatz</option>
                <option value={7}>Logistic Map</option>
                <option value={8}>Pseudo-Noise</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <ModularKnob
                label="Complexity"
                value={module.params.complexity ?? 5}
                min={1}
                max={20}
                step={1}
                onChange={(val) => updateModuleParams(module.id, { complexity: val })}
              />
              <ModularKnob
                label="Attenuation"
                value={module.params.attenuation ?? 0.8}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => updateModuleParams(module.id, { attenuation: val })}
              />
            </div>

            <div className="flex justify-center border-t border-black/10 pt-3 mt-1">
              <ModularPort
                id={`${module.id}-output-val`}
                label="CV Out"
                type="out"
                isPatched={isPortPatched(`${module.id}-output-val`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
            </div>
          </div>
        )}

        {/* SYNTH MODULE */}
        {module.type === 'synth' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[8px] uppercase tracking-wider text-black/40">Synth Model</span>
              <select
                className="bg-transparent border border-black px-2 py-1 outline-none font-mono text-[10px] cursor-pointer"
                value={module.params.type ?? 0}
                onChange={(e) => updateModuleParams(module.id, { type: parseInt(e.target.value) })}
              >
                <option value={0}>Triangle</option>
                <option value={1}>Celestial Pad</option>
                <option value={2}>Violin</option>
                <option value={3}>Guitar</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <ModularKnob
                label="Base MIDI"
                value={module.params.basePitch ?? 60}
                min={36}
                max={84}
                step={1}
                onChange={(val) => updateModuleParams(module.id, { basePitch: val })}
              />
              <ModularKnob
                label="Gain (dB)"
                value={module.params.volume ?? -10}
                min={-30}
                max={0}
                step={1}
                onChange={(val) => updateModuleParams(module.id, { volume: val })}
              />
            </div>

            <div className="border-t border-black/10 pt-3 mt-1 grid grid-cols-4 gap-2 justify-items-center">
              <ModularPort
                id={`${module.id}-input-pitch`}
                label="Pitch"
                type="in"
                isPatched={isPortPatched(`${module.id}-input-pitch`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
              <ModularPort
                id={`${module.id}-input-gate`}
                label="Gate"
                type="in"
                isPatched={isPortPatched(`${module.id}-input-gate`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
              <ModularPort
                id={`${module.id}-input-cutoff`}
                label="Cutoff"
                type="in"
                isPatched={isPortPatched(`${module.id}-input-cutoff`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
              <ModularPort
                id={`${module.id}-output-audio`}
                label="Audio"
                type="out"
                isPatched={isPortPatched(`${module.id}-output-audio`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
            </div>
          </div>
        )}

        {/* SCRIPT MODULE */}
        {module.type === 'script' && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[8px] uppercase tracking-wider text-black/40">Mathematical Code (Math.*)</span>
            <textarea
              className="w-full h-20 border border-black bg-neutral-50 p-1.5 font-mono text-[9px] outline-none focus:bg-white resize-none"
              value={module.scriptCode ?? ''}
              onChange={(e) => updateModuleScript(module.id, e.target.value)}
              placeholder={`// Write JS math. Return [0..1]
return Math.abs(Math.sin(step * 0.25));`}
            />

            <div className="flex justify-around items-center border-t border-black/10 pt-3 mt-1">
              <ModularKnob
                label="Att."
                value={module.params.attenuation ?? 1.0}
                min={0}
                max={1.0}
                step={0.05}
                onChange={(val) => updateModuleParams(module.id, { attenuation: val })}
              />
              <ModularPort
                id={`${module.id}-output-val`}
                label="CV Out"
                type="out"
                isPatched={isPortPatched(`${module.id}-output-val`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
            </div>
          </div>
        )}

        {/* SCOPE MODULE */}
        {module.type === 'scope' && (
          <div className="flex flex-col gap-3">
            <div className="border border-black overflow-hidden bg-[#fdfdfc] h-20">
              <canvas
                ref={canvasRef}
                width={230}
                height={80}
                className="w-full h-full block"
              />
            </div>

            <div className="border-t border-black/10 pt-3 mt-1 grid grid-cols-3 gap-2 justify-items-center">
              <ModularPort
                id={`${module.id}-input-audio`}
                label="Audio In"
                type="in"
                isPatched={isPortPatched(`${module.id}-input-audio`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
              <ModularKnob
                label="Speed"
                value={module.params.speed ?? 1}
                min={0.5}
                max={3.0}
                step={0.5}
                onChange={(val) => updateModuleParams(module.id, { speed: val })}
              />
              <ModularPort
                id={`${module.id}-input-cv`}
                label="CV In"
                type="in"
                isPatched={isPortPatched(`${module.id}-input-cv`)}
                onDragStart={setDragStartPort}
                onDragEnd={onDragPortEnd}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
