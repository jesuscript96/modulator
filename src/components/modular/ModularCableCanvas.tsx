import React, { useState, useEffect, useRef } from 'react';
import { useModularStore } from '../../stores/useModularStore';
import type { ModularCable } from '../../types';

interface Point {
  x: number;
  y: number;
}

interface PortRects {
  [portId: string]: Point;
}

interface ModularCableCanvasProps {
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  dragStartPort: string | null;
  setDragStartPort: (portId: string | null) => void;
  mousePos: Point;
}

export default function ModularCableCanvas({
  workspaceRef,
  dragStartPort,
  setDragStartPort,
  mousePos,
}: ModularCableCanvasProps) {
  const cables = useModularStore((s) => s.cables);
  const removeCable = useModularStore((s) => s.removeCable);
  const modules = useModularStore((s) => s.modules);

  const [portCoords, setPortCoords] = useState<PortRects>({});
  const animationFrameId = useRef<number | null>(null);

  // Read coordinates of all ports on the screen in real-time
  const updatePortCoords = () => {
    if (!workspaceRef.current) return;
    const workspaceRect = workspaceRef.current.getBoundingClientRect();
    const coords: PortRects = {};

    const jackElements = workspaceRef.current.querySelectorAll('[data-port-id]');
    jackElements.forEach((el) => {
      const portId = el.getAttribute('data-port-id');
      if (portId) {
        const rect = el.getBoundingClientRect();
        // Calculate center point of the circular jack relative to workspace
        coords[portId] = {
          x: rect.left + rect.width / 2 - workspaceRect.left,
          y: rect.top + rect.height / 2 - workspaceRect.top,
        };
      }
    });

    setPortCoords(coords);
    animationFrameId.current = requestAnimationFrame(updatePortCoords);
  };

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(updatePortCoords);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [modules, cables]);

  // Compute Cubic Bezier curve paths with tension / gravity hang
  const getBezierPath = (p1: Point, p2: Point): string => {
    const dx = Math.abs(p2.x - p1.x);
    const tension = 0.65; // VCV Rack style slack tension
    
    // Control points curve downwards simulating gravitational sag
    const cp1x = p1.x;
    const cp1y = p1.y + dx * tension;
    const cp2x = p2.x;
    const cp2y = p2.y + dx * tension;

    return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  };

  const handleCableClick = (cableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCable(cableId);
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 select-none">
      <defs>
        {/* Neon glowing filters for cords */}
        <filter id="glow-cable" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Render active patched cables */}
      {cables.map((c) => {
        const start = portCoords[c.fromPortId];
        const end = portCoords[c.toPortId];
        if (!start || !end) return null;

        const pathStr = getBezierPath(start, end);
        return (
          <g key={c.id} className="pointer-events-auto cursor-pointer group">
            {/* Fat transparent overlay for easy hovering and clicking */}
            <path
              d={pathStr}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              onClick={(e) => handleCableClick(c.id, e)}
            />
            {/* Slinky shadow for depth */}
            <path
              d={pathStr}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={3}
              className="translate-y-2.5 transition-all duration-200"
            />
            {/* The colorful cables */}
            <path
              d={pathStr}
              fill="none"
              stroke={c.color}
              strokeWidth={3}
              filter="url(#glow-cable)"
              className="transition-all duration-200 group-hover:stroke-red-500 group-hover:stroke-[4]"
              onClick={(e) => handleCableClick(c.id, e)}
            />
            {/* Tiny hover tip to delete */}
            <title>Click to disconnect cable</title>
          </g>
        );
      })}

      {/* Render active preview cable while dragging */}
      {dragStartPort && portCoords[dragStartPort] && (
        <g>
          <path
            d={getBezierPath(portCoords[dragStartPort], mousePos)}
            fill="none"
            stroke="#ff0077"
            strokeWidth={3.5}
            strokeDasharray="4,4"
            className="opacity-80"
          />
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r={5}
            fill="#ff0077"
            className="animate-pulse"
          />
        </g>
      )}
    </svg>
  );
}
