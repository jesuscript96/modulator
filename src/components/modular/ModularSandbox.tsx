import React, { useState, useRef, useEffect } from 'react';
import { useModularStore } from '../../stores/useModularStore';
import { ModularAudioEngine } from '../../engine/modular/ModularAudioEngine';
import ModularModuleCard from './ModularModuleCard';
import ModularCableCanvas from './ModularCableCanvas';
import { Play, Square, Plus, Trash2, HelpCircle } from 'lucide-react';
import HelpTooltip from '../shared/HelpTooltip';

export default function ModularSandbox() {
  const modules = useModularStore((s) => s.modules);
  const cables = useModularStore((s) => s.cables);
  const addModule = useModularStore((s) => s.addModule);
  const addCable = useModularStore((s) => s.addCable);
  const clearModularSandbox = useModularStore((s) => s.clearModularSandbox);

  const [engine, setEngine] = useState<ModularAudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  // Connection Drag State
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [dragStartPort, setDragStartPort] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. Initialise the engine
  useEffect(() => {
    const newEngine = new ModularAudioEngine();
    setEngine(newEngine);
    return () => {
      newEngine.dispose();
    };
  }, []);

  // Update BPM in engine
  useEffect(() => {
    if (engine) {
      engine.setBpm(bpm);
    }
  }, [bpm, engine]);

  const handlePlayToggle = async () => {
    if (!engine) return;
    const playing = await engine.togglePlayback();
    setIsPlaying(playing);
  };

  // 2. Drag-and-drop patching events
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartPort || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    // Cancel cable dragging if released on empty space
    if (dragStartPort) {
      setDragStartPort(null);
    }
  };

  const handleDragPortEnd = (targetPortId: string) => {
    if (!dragStartPort) return;
    
    // Safety check: Cannot patch to the same port, and cannot connect two input/output ports together
    const isFromOut = dragStartPort.includes('output');
    const isToIn = targetPortId.includes('input');
    
    if (isFromOut && isToIn) {
      // Pick a random aesthetic cable color (flat brutalist neon)
      const colors = ['#ff0077', '#00bb66', '#0077ff', '#ffaa00', '#aa00ff'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newCable = {
        id: `cable-${Date.now()}`,
        fromPortId: dragStartPort,
        toPortId: targetPortId,
        color: randomColor,
      };
      addCable(newCable);
    }
    setDragStartPort(null);
  };

  // 3. Module Creator helpers
  const handleAddModule = (type: 'modulator' | 'synth' | 'script' | 'scope') => {
    const id = `module-${type}-${Date.now()}`;
    const count = modules.filter((m) => m.type === type).length + 1;
    
    let name = '';
    let inputs: any[] = [];
    let outputs: any[] = [];
    let params: Record<string, number> = {};
    let scriptCode = undefined;

    switch (type) {
      case 'modulator':
        name = `Modulator ${count}`;
        params = { type: 0, complexity: 5, attenuation: 0.8 };
        outputs = [{ id: `${id}-output-val`, moduleId: id, label: 'CV Out', type: 'out', paramName: 'value' }];
        break;
      case 'synth':
        name = `Synth ${count}`;
        params = { type: 0, basePitch: 60, volume: -10 };
        inputs = [
          { id: `${id}-input-pitch`, moduleId: id, label: 'Pitch CV', type: 'in', paramName: 'pitch' },
          { id: `${id}-input-gate`, moduleId: id, label: 'Gate (Trig)', type: 'in', paramName: 'gate' },
          { id: `${id}-input-cutoff`, moduleId: id, label: 'Filter CV', type: 'in', paramName: 'cutoff' },
        ];
        outputs = [{ id: `${id}-output-audio`, moduleId: id, label: 'Audio Out', type: 'out', paramName: 'audio' }];
        break;
      case 'script':
        name = `Math Script ${count}`;
        params = { attenuation: 1.0 };
        scriptCode = `// Generador Matemático Custom
// step: índice del secuenciador (16n)
// time: tiempo del audio en segundos
// Math: objeto estándar JS

let cycle = step % 8;
return Math.abs(Math.sin(cycle * 0.4));`;
        outputs = [{ id: `${id}-output-val`, moduleId: id, label: 'CV Out', type: 'out', paramName: 'value' }];
        break;
      case 'scope':
        name = `Scope ${count}`;
        params = { speed: 1.0 };
        inputs = [
          { id: `${id}-input-audio`, moduleId: id, label: 'Audio In', type: 'in', paramName: 'audio' },
          { id: `${id}-input-cv`, moduleId: id, label: 'CV In', type: 'in', paramName: 'cv' },
        ];
        break;
    }

    addModule({
      id,
      type,
      name,
      x: 100 + (modules.length * 40) % 300,
      y: 120 + (modules.length * 30) % 200,
      params,
      inputs,
      outputs,
      scriptCode,
    });
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 h-full relative overflow-hidden bg-[#fafaf7] select-none text-xs font-mono">
      {/* Sandbox Header / Toolbar */}
      <div className="border-b border-black px-6 py-3 flex flex-wrap items-center justify-between gap-4 bg-[#f4f4f0] z-30">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
            Modular Sandbox
            <HelpTooltip
              title="Modular Sandbox"
              technical="Entorno modular eurorack virtual. Permite interconectar generadores matemáticos y sintetizadores usando voltajes de control (CV)."
              beginner="¡Crea tu propio sintetizador! Añade módulos, conecta perillas y puertos arrastrando cables virtuales, y descubre cómo las matemáticas generan melodías."
            />
          </h2>
          
          <div className="flex items-center gap-2 border-l border-black/10 pl-4">
            <button
              onClick={() => handleAddModule('modulator')}
              className="border border-black px-2 py-1 flex items-center gap-1 hover:bg-black hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Modulator
            </button>
            <button
              onClick={() => handleAddModule('script')}
              className="border border-black px-2 py-1 flex items-center gap-1 hover:bg-black hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Script
            </button>
            <button
              onClick={() => handleAddModule('synth')}
              className="border border-black px-2 py-1 flex items-center gap-1 hover:bg-black hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Synth
            </button>
            <button
              onClick={() => handleAddModule('scope')}
              className="border border-black px-2 py-1 flex items-center gap-1 hover:bg-black hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Scope
            </button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-black/50 uppercase">BPM:</span>
            <input
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="accent-black w-24 h-1 cursor-pointer"
            />
            <span className="font-bold w-8 text-right">{bpm}</span>
          </div>

          <button
            onClick={handlePlayToggle}
            className="border border-black px-4 py-1 flex items-center gap-1.5 uppercase hover:bg-black hover:text-white transition-colors"
          >
            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Start'}
          </button>

          <button
            onClick={clearModularSandbox}
            className="border border-black px-3 py-1 text-black/50 hover:text-red-600 hover:border-red-600 transition-colors flex items-center gap-1"
            title="Clear entire rack"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Grid instructions overlay */}
      <div className="absolute top-20 right-6 text-[9px] text-black/30 text-right z-10 max-w-xs pointer-events-none leading-relaxed">
        <p className="font-bold">INSTRUCCIONES:</p>
        <p>1. Añade un módulo Modulator y uno Synth.</p>
        <p>2. Arrastra desde "CV Out" hacia "Gate (Trig)" o "Pitch".</p>
        <p>3. Pulsa "Start" para oír y "Scope" para ver la señal.</p>
        <p>4. Haz clic en un cable para desconectarlo.</p>
      </div>

      {/* The Workspace canvas */}
      <div
        ref={workspaceRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-grow w-full h-full relative overflow-auto bg-[#e5e5de] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"
        style={{ minHeight: '600px' }}
      >
        {/* Render cable patching layer */}
        <ModularCableCanvas
          workspaceRef={workspaceRef}
          dragStartPort={dragStartPort}
          setDragStartPort={setDragStartPort}
          mousePos={mousePos}
        />

        {/* Render modular panels */}
        {modules.map((m) => (
          <ModularModuleCard
            key={m.id}
            module={m}
            engine={engine}
            dragStartPort={dragStartPort}
            setDragStartPort={setDragStartPort}
            onDragPortEnd={handleDragPortEnd}
          />
        ))}
      </div>
    </div>
  );
}
