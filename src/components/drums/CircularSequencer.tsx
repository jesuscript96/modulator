import React from 'react';

interface CircularSequencerProps {
  step: number;
  patterns: {
    kick: boolean[];
    snare: boolean[];
    hihat: boolean[];
    perc: boolean[];
  };
}

const CircularSequencer: React.FC<CircularSequencerProps> = ({ step, patterns }) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;

  const renderPolygon = (pattern: boolean[], color: string, rOffset: number) => {
    const r = radius * rOffset;
    const points = pattern
      .map((active, i) => {
        if (!active) return null;
        const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
        return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
      })
      .filter(Boolean)
      .join(' ');

    return (
      <g key={rOffset}>
        <polygon points={points} fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
        {pattern.map((active, i) => {
          if (!active) return null;
          const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const cx = center + Math.cos(angle) * r;
          const cy = center + Math.sin(angle) * r;
          const isCurrent = i === step;
          return (
            <circle key={i} cx={cx} cy={cy} r={isCurrent ? 4 : 2} fill={isCurrent ? 'black' : color} />
          );
        })}
      </g>
    );
  };

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e5e5" strokeWidth="1" />
      <circle cx={center} cy={center} r={radius * 0.75} fill="none" stroke="#e5e5e5" strokeWidth="1" />
      <circle cx={center} cy={center} r={radius * 0.5} fill="none" stroke="#e5e5e5" strokeWidth="1" />

      <line
        x1={center}
        y1={center}
        x2={center + Math.cos((step / 16) * Math.PI * 2 - Math.PI / 2) * radius}
        y2={center + Math.sin((step / 16) * Math.PI * 2 - Math.PI / 2) * radius}
        stroke="black"
        strokeWidth="1"
        opacity="0.2"
      />

      {renderPolygon(patterns.kick, 'black', 1)}
      {renderPolygon(patterns.snare, 'black', 0.75)}
      {renderPolygon(patterns.hihat, 'black', 0.5)}
      {renderPolygon(patterns.perc, 'black', 0.25)}
    </svg>
  );
};

export default CircularSequencer;
