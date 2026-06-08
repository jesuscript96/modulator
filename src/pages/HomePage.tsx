import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cpu, LayoutGrid, Sparkles, Library, Volume2, HelpCircle } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle interactive geometric animation in canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Centre of animation
      const cx = width / 2;
      const cy = height / 2;

      // Draw concentric geometric circles (Golden Ratio scales)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      let r = 20;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        r = r * 1.618; // Golden Ratio expansion
      }

      // Draw mathematical lines extending to mouse position
      const targetX = mousePos.x || cx;
      const targetY = mousePos.y || cy;
      
      // Interpolate center towards mouse
      const mx = cx + (targetX - cx) * 0.15;
      const my = cy + (targetY - cy) * 0.15;

      // Draw interactive lines (expanding geometric web)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1.5;
      const steps = 18;
      for (let i = 0; i < steps; i++) {
        const theta = (i * Math.PI * 2) / steps + angle;
        const x1 = mx + Math.cos(theta) * 60;
        const y1 = my + Math.sin(theta) * 60;
        
        const outerTheta = theta + Math.PI / 6;
        const x2 = cx + Math.cos(outerTheta) * 200;
        const y2 = cy + Math.sin(outerTheta) * 200;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Small nodes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Spiral overlay
      ctx.strokeStyle = 'rgba(255, 0, 119, 0.35)'; // Accent Pink
      ctx.lineWidth = 2;
      ctx.beginPath();
      let theta = 0;
      let spiralR = 1;
      let sx = cx;
      let sy = cy;
      ctx.moveTo(sx, sy);
      for (let i = 0; i < 300; i++) {
        theta = i * 0.06;
        spiralR = Math.pow(1.15, theta) * 3; // logarithmic spiral
        sx = cx + Math.cos(theta + angle * 0.2) * spiralR;
        sy = cy + Math.sin(theta + angle * 0.2) * spiralR;
        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();

      angle += 0.004;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="p-4 md:p-8 flex flex-col flex-grow bg-[#f4f4f0] overflow-auto">
      {/* Header */}
      <header className="border-b border-black pb-8 mb-8 relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-[10vw] leading-[0.8] font-black tracking-tighter uppercase text-neutral-900">
            Audio Geometria
          </h1>
          <h2 className="text-[6.5vw] leading-[0.85] font-bold tracking-tighter text-black/80 uppercase">
            Algorithmic Sound
          </h2>
          <h3 className="text-[5vw] leading-[0.85] font-semibold tracking-tighter text-black/60 uppercase">
            Musique Mathématique
          </h3>
        </div>

        {/* Dynamic Interactive Visualizer Card */}
        <div 
          onMouseMove={handleMouseMove}
          className="w-full md:w-80 h-48 border border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden group cursor-crosshair shrink-0"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute bottom-2 left-2 text-[8px] font-mono text-black/45 pointer-events-none">
            GEOMETRIC FRACTAL CANVAS (MOVE MOUSE)
          </div>
        </div>
      </header>

      {/* Info Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b border-black pb-8 mb-8 text-xs leading-relaxed text-neutral-800">
        <div>
          <p className="font-bold text-black mb-2 uppercase tracking-wide">
            Internationale Zeitschrift
          </p>
          <p>
            This application explores the intersection of Euclidean geometry, mathematical
            sequences, and virtual modular synthesis. By translating algorithms like Bjorklund's, Fibonacci,
            and chaos math directly into trigger clocks and voltage waveforms, we orchestrate organic soundscapes.
          </p>
        </div>
        <div>
          <p className="font-bold text-black mb-2 uppercase tracking-wide">Euclidean Rhythms</p>
          <p>
            Rhythmic patterns are mathematically distributed using Bjorklund's algorithm, dispersing pulses
            as evenly as possible over step intervals. This discovers deep rhythmic structures present across
            diverse musical cultures, visualized as geometric circles.
          </p>
        </div>
        <div>
          <p className="font-bold text-black mb-2 uppercase tracking-wide">Algorithmic Modulators</p>
          <p>
            Fibonacci series control envelope times, the Golden Ratio dictates frequency openings, and
            the Logistic Map introduces chaotic fluctuations. These functions generate organic control voltage (CV)
            modulations that breathe life into acoustic models.
          </p>
        </div>
        <div>
          <p className="font-bold text-black mb-2 uppercase tracking-wide">Virtual modular rack</p>
          <p>
            Inspired by VCV Rack and classic Eurorack designs, the Modular Sandbox and Modular Drums modules
            provide patchable oscillators, clocks, filters, mixers, and visual scopes. Connect them using
            dynamic cables and let the mathematics play the sound.
          </p>
        </div>
      </div>

      {/* Reorganized Gateway Sections Showcase */}
      <div className="flex flex-col gap-4">
        <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-black/45 mb-2">
          EXPLORE SYSTEMS / EXPLORAR SISTEMAS
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Modular Drums */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-emerald-500 text-white p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <Volume2 className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-200">NEW SYSTEM</span>
              </div>
              <h5 className="font-black text-lg uppercase tracking-tight mb-2 text-neutral-900 group-hover:text-emerald-600 transition-colors">
                Modular Drums Rack
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                A virtual Eurorack drum machine rack. Patch trigger gates, swing clocks, and mathematical modulators into dedicated analog drum voice synthesizers (Kick, Snare, Hi-hat, FM).
              </p>
            </div>
            <button
              onClick={() => navigate('/drums')}
              className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-between w-full"
            >
              Open Drums Rack <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Math Composer */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-600 text-white p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <h5 className="font-black text-lg uppercase tracking-tight mb-2 text-neutral-900 group-hover:text-indigo-600 transition-colors">
                Math Composer
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                An algorithmic melody composer. Generate dodecaphonic twelve-tone rows, Collatz conjecture orbits, fractal L-systems, and logistic chaos maps. Export them directly as clips.
              </p>
            </div>
            <button
              onClick={() => navigate('/composer')}
              className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-between w-full"
            >
              Open Composer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Modular Sandbox */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-cyan-500 text-white p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <h5 className="font-black text-lg uppercase tracking-tight mb-2 text-neutral-900 group-hover:text-cyan-600 transition-colors">
                Modular Sandbox
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                A modular synthesizer testing room. Build custom synthesizer models, filter networks, or insert raw mathematical Javascript code script modulators to construct signals.
              </p>
            </div>
            <button
              onClick={() => navigate('/modular')}
              className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-between w-full"
            >
              Open Sandbox <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Orchestration Board */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-500 text-white p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <LayoutGrid className="w-5 h-5" />
                </div>
              </div>
              <h5 className="font-black text-lg uppercase tracking-tight mb-2 text-neutral-900 group-hover:text-amber-500 transition-colors">
                Arranger Board
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                Orchestrate and sequence multiple geometric clips in a multi-lane audio canvas. Arrange timings, BPM, volume levels, and trigger playback synchronizations.
              </p>
            </div>
            <button
              onClick={() => navigate('/board')}
              className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-between w-full"
            >
              Open Arranger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 5: Fragment Library */}
          <div className="border border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-zinc-800 text-white p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <Library className="w-5 h-5" />
                </div>
              </div>
              <h5 className="font-black text-lg uppercase tracking-tight mb-2 text-neutral-900 group-hover:text-zinc-600 transition-colors">
                Fragment Library
              </h5>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                Access, monitor, and delete all exported and recorded audio buffers, sequences, and drums rendered throughout your design sessions.
              </p>
            </div>
            <button
              onClick={() => navigate('/library')}
              className="border border-black px-4 py-2 text-[10px] uppercase font-mono tracking-widest hover:bg-black hover:text-[#f4f4f0] transition-colors flex items-center justify-between w-full"
            >
              Open Library <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
