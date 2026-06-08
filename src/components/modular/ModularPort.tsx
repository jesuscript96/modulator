import React from 'react';

interface ModularPortProps {
  id: string;
  label: string;
  type: 'in' | 'out';
  isPatched: boolean;
  onDragStart: (portId: string) => void;
  onDragEnd: (portId: string) => void;
}

export default function ModularPort({
  id,
  label,
  type,
  isPatched,
  onDragStart,
  onDragEnd,
}: ModularPortProps) {
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
      <span className="text-[8px] font-mono uppercase tracking-wider text-black/55">{label}</span>
      <div
        data-port-id={id}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className={`w-5 h-5 rounded-full border border-black flex items-center justify-center cursor-pointer transition-all relative ${
          type === 'in'
            ? 'bg-red-50 hover:bg-red-100 border-dashed'
            : 'bg-zinc-100 hover:bg-zinc-200'
        } ${isPatched ? 'ring-2 ring-black bg-black' : ''}`}
        title={type === 'in' ? 'Drag a cable here to connect' : 'Drag from here to patch out'}
      >
        {/* Core hole of jack */}
        <div
          className={`w-2.5 h-2.5 rounded-full border border-black/30 ${
            isPatched ? 'bg-[#ff0077]' : 'bg-black/90'
          }`}
        />
      </div>
    </div>
  );
}
