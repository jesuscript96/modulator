import React from 'react';

interface DrumsPortProps {
  id: string;
  label: string;
  type: 'in' | 'out';
  isPatched: boolean;
  onDragStart: (portId: string) => void;
  onDragEnd: (portId: string) => void;
}

export default function DrumsPort({
  id,
  label,
  type,
  isPatched,
  onDragStart,
  onDragEnd,
}: DrumsPortProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'out') {
      onDragStart(id);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'in') {
      onDragEnd(id);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">{label}</span>
      <div
        data-port-id={id}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className={`w-6 h-6 rounded-full border border-neutral-700 bg-neutral-900 flex items-center justify-center cursor-pointer transition-all relative hover:scale-105 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] ${
          isPatched ? 'ring-2 ring-emerald-500' : ''
        }`}
        title={type === 'in' ? 'Drag a trigger or CV cable here' : 'Drag from here to connect'}
      >
        {/* Metal ring sleeve */}
        <div className="w-4 h-4 rounded-full border border-neutral-600 bg-neutral-800 flex items-center justify-center">
          {/* Port socket hole */}
          <div
            className={`w-2 h-2 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] ${
              isPatched ? 'bg-emerald-500 animate-pulse' : 'bg-black'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
