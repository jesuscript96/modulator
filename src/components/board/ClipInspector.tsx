import React from 'react';
import type { Clip, AffineMatrix } from '../../types';
import { Transforms } from '../../engine/math/affine';
import { X, RotateCcw, FlipHorizontal, FlipVertical, MoveHorizontal, ArrowUpDown } from 'lucide-react';
import HelpTooltip from '../shared/HelpTooltip';
import helpContent from '../../data/helpContent';

interface ClipInspectorProps {
  clip: Clip | null;
  onClose: () => void;
  onTransform: (clipId: string, matrix: AffineMatrix) => void;
}

interface TransformButton {
  label: string;
  icon: React.ReactNode;
  matrix: () => AffineMatrix;
  matrixStr: string;
}

export default function ClipInspector({ clip, onClose, onTransform }: ClipInspectorProps) {
  if (!clip) return null;

  const maxT = Math.max(...clip.vectors.map((v) => v.t + v.duration), clip.duration * 1000);
  const avgPitch = clip.vectors.length > 0
    ? clip.vectors.reduce((s, v) => s + v.p, 0) / clip.vectors.length
    : 60;

  const transforms: TransformButton[] = [
    {
      label: 'Retrograde',
      icon: <FlipHorizontal className="w-3.5 h-3.5" />,
      matrix: () => Transforms.retrograde(maxT),
      matrixStr: '[-1, 0, 0, 1, T, 0]',
    },
    {
      label: 'Inversion',
      icon: <FlipVertical className="w-3.5 h-3.5" />,
      matrix: () => Transforms.inversion(avgPitch),
      matrixStr: '[1, 0, 0, -1, 0, 2p]',
    },
    {
      label: 'Augment (2x)',
      icon: <MoveHorizontal className="w-3.5 h-3.5" />,
      matrix: () => Transforms.timeScale(2),
      matrixStr: '[2, 0, 0, 1, 0, 0]',
    },
    {
      label: 'Diminish (0.5x)',
      icon: <MoveHorizontal className="w-3.5 h-3.5" />,
      matrix: () => Transforms.timeScale(0.5),
      matrixStr: '[0.5, 0, 0, 1, 0, 0]',
    },
    {
      label: 'Transpose +12',
      icon: <ArrowUpDown className="w-3.5 h-3.5" />,
      matrix: () => Transforms.translate(0, 12),
      matrixStr: '[1, 0, 0, 1, 0, 12]',
    },
    {
      label: 'Rotate 15°',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      matrix: () => Transforms.rotate(15),
      matrixStr: '[cos15, -sin15, sin15, cos15, 0, 0]',
    },
  ];

  return (
    <div className="w-72 border-l border-black bg-[#f4f4f0] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black p-3">
        <h3 className="font-bold text-xs uppercase tracking-widest">Inspector</h3>
        <button onClick={onClose} className="text-black/40 hover:text-black">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Clip Info */}
      <div className="p-3 border-b border-black/20 text-xs font-mono">
        <div className="font-bold text-sm mb-2">{clip.name}</div>
        <div className="flex justify-between"><span>Lane:</span><span>{clip.lane}</span></div>
        <div className="flex justify-between"><span>Start:</span><span>{clip.startTime.toFixed(1)} beats</span></div>
        <div className="flex justify-between"><span>Duration:</span><span>{clip.duration.toFixed(1)} beats</span></div>
        <div className="flex justify-between"><span>Vectors:</span><span>{clip.vectors.length}</span></div>
        {clip.modulators.length > 0 && (
          <div className="mt-2 pt-2 border-t border-black/10">
            <span className="text-[10px] uppercase tracking-wider text-black/50">Modulators</span>
            {clip.modulators.map((mod, i) => (
              <div key={i} className="flex justify-between">
                <span>{mod.type}</span>
                <span>{mod.target}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Affine Transforms */}
      <div className="p-3">
        <h4 className="font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          Affine Transforms
          <HelpTooltip {...(helpContent.affineTransform || {
            title: 'Affine Transforms',
            technical: 'Transformación afín 3×3 sobre vectores V=(t,p). Cada botón aplica una matriz que modifica la estructura temporal y/o tonal del clip.',
            beginner: 'Como voltear o estirar una melodía: puedes invertirla, ponerla al revés, hacerla más lenta o más rápida, o cambiarle las notas.',
          })} />
        </h4>
        <div className="flex flex-col gap-1.5">
          {transforms.map((t) => (
            <button
              key={t.label}
              onClick={() => onTransform(clip.id, t.matrix())}
              className="group flex items-center gap-2 text-xs border border-black/20 px-2 py-1.5 hover:bg-black hover:text-[#f4f4f0] transition-colors text-left"
              title={t.matrixStr}
            >
              {t.icon}
              <span className="flex-grow">{t.label}</span>
              <span className="font-mono text-[9px] text-black/30 group-hover:text-white/40 hidden sm:inline">
                {t.matrixStr}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
