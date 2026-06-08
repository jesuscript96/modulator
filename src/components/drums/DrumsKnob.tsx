import React, { useRef } from 'react';

interface DrumsKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
}

export default function DrumsKnob({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  unit = '',
}: DrumsKnobProps) {
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
    <div className="flex flex-col items-center gap-0.5 select-none font-mono">
      <span className="text-[7px] uppercase tracking-wider text-neutral-500 font-bold text-center w-full truncate">{label}</span>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="w-9 h-9 rounded-full border border-black bg-white flex items-center justify-center cursor-ns-resize shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 transition-colors relative"
        title="Double click to reset to middle"
      >
        {/* Outer grip lines */}
        <div className="absolute inset-0.5 rounded-full border border-dashed border-neutral-300 pointer-events-none" />
        
        {/* Metal knob cap */}
        <div className="w-6 h-6 rounded-full bg-[#eaeae6] border border-black flex items-center justify-center shadow-inner relative">
          {/* Needle dot/line */}
          <div
            className="absolute w-[2px] h-2.5 bg-black origin-bottom"
            style={{
              transform: `rotate(${degrees}deg) translateY(-5px)`,
            }}
          />
        </div>
      </div>
      <span className="text-[8px] text-neutral-800 mt-0.5 font-bold">
        {value.toFixed(step >= 0.1 ? 1 : 2)}
        {unit}
      </span>
    </div>
  );
}
