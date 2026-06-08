import React, { useRef } from 'react';

interface ModularKnobProps {
  label: string;
  value: number; // Normalized 0..1
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
}

export default function ModularKnob({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: ModularKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; val: number } | null>(null);

  const valToDeg = (v: number) => {
    // Range: -135deg (min) to +135deg (max)
    const norm = (v - min) / (max - min);
    return -135 + norm * 270;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = {
      y: e.clientY,
      val: value,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current) return;
    const deltaY = dragStartRef.current.y - e.clientY; // drag up increases value
    const sensitivity = 0.005; // speed of adjustment
    const deltaVal = deltaY * sensitivity * (max - min);
    let newVal = dragStartRef.current.val + deltaVal;

    // Constrain and round to step
    newVal = Math.max(min, Math.min(max, newVal));
    const rounded = Math.round(newVal / step) * step;
    onChange(Number(rounded.toFixed(4)));
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    // Reset to default (midpoint)
    onChange((max + min) / 2);
  };

  const degrees = valToDeg(value);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[8px] font-mono uppercase tracking-widest text-black/50">{label}</span>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="w-8 h-8 rounded-full border border-black bg-white flex items-center justify-center cursor-ns-resize shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-black/5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all relative"
      >
        {/* Needle */}
        <div
          className="absolute w-[1.5px] h-3 bg-black origin-bottom"
          style={{
            transform: `rotate(${degrees}deg) translateY(-6px)`,
          }}
        />
      </div>
      <span className="text-[9px] font-mono text-black/60 mt-0.5">{value}</span>
    </div>
  );
}
