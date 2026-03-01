import React, { useRef, useEffect } from 'react';
import HelpTooltip from './HelpTooltip';

export interface ConsoleEntry {
  step: number;
  fn: string;
  input: string;
  result: string;
  target: string;
}

interface MathConsoleProps {
  entries: ConsoleEntry[];
  maxEntries?: number;
}

export default function MathConsole({ entries, maxEntries = 50 }: MathConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = entries.slice(-maxEntries);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="border border-black/20 bg-[#111] text-[#f4f4f0] flex flex-col">
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono">
          Math Console
        </span>
        <HelpTooltip
          title="Math Console"
          technical="Log en tiempo real de todas las evaluaciones de funciones matemáticas. Muestra step, función, entrada, resultado y parámetro destino."
          beginner="Un registro que muestra todos los cálculos que la app está haciendo en este momento. Cada línea es una operación matemática que cambia cómo suena la música."
        />
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto font-mono text-[10px] leading-relaxed max-h-40 px-2 py-1"
      >
        {visible.length === 0 ? (
          <div className="text-white/20 py-2 text-center">No calculations yet</div>
        ) : (
          visible.map((e, i) => (
            <div key={i} className="flex gap-2 text-white/70 hover:text-white/90">
              <span className="text-white/30 w-12 text-right shrink-0">
                [{e.step.toString().padStart(3, '0')}]
              </span>
              <span className="text-[var(--color-freq-low-mid)]">{e.fn}</span>
              <span className="text-white/30">(</span>
              <span>{e.input}</span>
              <span className="text-white/30">)</span>
              <span className="text-white/30">=</span>
              <span className="text-white font-bold">{e.result}</span>
              <span className="text-white/20">→</span>
              <span className="text-[var(--color-freq-mid)]">{e.target}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
