import React, { useRef, useEffect } from 'react';

interface MathGraphProps {
  values: number[];
  currentIndex?: number;
  width?: number;
  height?: number;
  color?: string;
  type?: 'line' | 'bar' | 'spiral';
}

export default function MathGraph({
  values,
  currentIndex,
  width = 120,
  height = 50,
  color = '#111',
  type = 'line',
}: MathGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const maxVal = Math.max(...values.map(Math.abs), 0.001);

    if (type === 'spiral') {
      drawSpiral(ctx, values, width, height, color, currentIndex);
    } else if (type === 'bar') {
      const barW = width / values.length;
      values.forEach((v, i) => {
        const h = (Math.abs(v) / maxVal) * height * 0.9;
        const isCurrent = i === currentIndex;
        ctx.fillStyle = isCurrent ? color : `${color}40`;
        ctx.fillRect(i * barW, height - h, barW - 1, h);
      });
    } else {
      ctx.strokeStyle = `${color}30`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / maxVal) * height * 0.8 - height * 0.1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (currentIndex !== undefined && currentIndex < values.length) {
        const x = (currentIndex / (values.length - 1)) * width;
        const y = height - (values[currentIndex] / maxVal) * height * 0.8 - height * 0.1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [values, currentIndex, width, height, color, type]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
      style={{ imageRendering: 'auto' }}
    />
  );
}

function drawSpiral(
  ctx: CanvasRenderingContext2D,
  values: number[],
  w: number,
  h: number,
  color: string,
  currentIndex?: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) / 2 - 4;
  const maxVal = Math.max(...values, 1);

  ctx.strokeStyle = `${color}30`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  values.forEach((v, i) => {
    const angle = (i / values.length) * Math.PI * 4;
    const r = (v / maxVal) * maxR * ((i + 1) / values.length);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  if (currentIndex !== undefined && currentIndex < values.length) {
    const angle = (currentIndex / values.length) * Math.PI * 4;
    const r = (values[currentIndex] / maxVal) * maxR * ((currentIndex + 1) / values.length);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
