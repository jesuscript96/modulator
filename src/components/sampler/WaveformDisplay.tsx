import React, { useMemo } from 'react';

interface WaveformDisplayProps {
  data: number[];
  currentStep: number;
  totalSteps: number;
  selectionStart?: number;
  selectionEnd?: number;
  onSelectionChange?: (start: number, end: number) => void;
  height?: number;
}

const FREQ_PALETTE = [
  '#8B0000', '#CC3300', '#FF6600', '#FF9900',
  '#FFD700', '#88AA00', '#00AA44', '#0066CC',
  '#0044AA', '#5500AA', '#7700CC', '#9900AA',
];

export default function WaveformDisplay({
  data,
  currentStep,
  totalSteps,
  selectionStart,
  selectionEnd,
  height = 160,
}: WaveformDisplayProps) {
  const playheadIndex = useMemo(
    () => Math.floor((currentStep / totalSteps) * data.length),
    [currentStep, totalSteps, data.length]
  );

  const maxVal = useMemo(() => Math.max(...data, 0.001), [data]);

  if (data.length === 0) return null;

  return (
    <div className="w-full flex items-end gap-[1px] relative" style={{ height }}>
      {data.map((v, i) => {
        const normalized = v / maxVal;
        const colorIdx = Math.floor((i / data.length) * FREQ_PALETTE.length);
        const isPlayhead = i === playheadIndex;
        const inSelection =
          selectionStart !== undefined &&
          selectionEnd !== undefined &&
          i >= selectionStart &&
          i <= selectionEnd;

        return (
          <div
            key={i}
            className="w-full transition-opacity duration-75"
            style={{
              height: `${normalized * 100}%`,
              backgroundColor: isPlayhead ? '#111' : inSelection ? FREQ_PALETTE[colorIdx] : '#111',
              opacity: isPlayhead ? 1 : inSelection ? 0.8 : 0.25,
            }}
          />
        );
      })}
    </div>
  );
}
