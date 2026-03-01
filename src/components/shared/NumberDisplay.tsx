import React from 'react';

interface NumberDisplayProps {
  value: number;
  label?: string;
  decimals?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  colorByValue?: boolean;
}

const FREQ_PALETTE: Array<{ max: number; color: string }> = [
  { max: 100, color: 'var(--color-freq-sub)' },
  { max: 300, color: 'var(--color-freq-bass)' },
  { max: 1000, color: 'var(--color-freq-low-mid)' },
  { max: 3000, color: 'var(--color-freq-mid)' },
  { max: 8000, color: 'var(--color-freq-high-mid)' },
  { max: 20000, color: 'var(--color-freq-high)' },
];

function getColorForValue(v: number): string {
  for (const band of FREQ_PALETTE) {
    if (v <= band.max) return band.color;
  }
  return '#111';
}

export default function NumberDisplay({
  value,
  label,
  decimals = 1,
  unit,
  size = 'sm',
  colorByValue = false,
}: NumberDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  }[size];

  const formatted = value.toFixed(decimals);
  const color = colorByValue ? getColorForValue(Math.abs(value)) : undefined;

  return (
    <span className={`font-mono tabular-nums ${sizeClasses}`}>
      {label && <span className="text-black/40 mr-1">{label}</span>}
      <span
        className="font-bold transition-colors duration-150"
        style={color ? { color } : undefined}
      >
        {formatted}
      </span>
      {unit && <span className="text-black/40 ml-0.5">{unit}</span>}
    </span>
  );
}
