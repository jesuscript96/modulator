import React, { useState, useRef, useEffect } from 'react';
import { CircleHelp } from 'lucide-react';

interface HelpTooltipProps {
  title?: string;
  technical: string;
  beginner: string;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ title, technical, beginner }) => {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-black/30 hover:text-black/70 transition-colors cursor-help"
        aria-label="Help"
        type="button"
      >
        <CircleHelp className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#111] text-[#f4f4f0] text-xs rounded-sm shadow-lg"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="p-3">
            {title && (
              <p className="font-bold uppercase tracking-widest text-[10px] text-white/60 mb-2">
                {title}
              </p>
            )}
            <p className="font-mono leading-relaxed mb-2">
              <span className="text-white/40 uppercase text-[9px] tracking-wider">Técnico: </span>
              {technical}
            </p>
            <div className="border-t border-white/10 my-2" />
            <p className="leading-relaxed">
              <span className="text-white/40 uppercase text-[9px] tracking-wider">Ejemplo: </span>
              {beginner}
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#111]" />
        </div>
      )}
    </span>
  );
};

export default HelpTooltip;
