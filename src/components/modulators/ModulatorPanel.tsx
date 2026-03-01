import React, { useState } from 'react';
import type { ModulatorType, ModulatorTarget } from '../../types';
import ModulatorCard from './ModulatorCard';
import HelpTooltip from '../shared/HelpTooltip';

interface ModulatorPanelProps {
  currentStep: number;
  complexity: number;
  onComplexityChange: (c: number) => void;
  activeModulator: ModulatorType | 'none';
  onModulatorChange: (type: ModulatorType | 'none') => void;
}

const ALL_TYPES: ModulatorType[] = [
  'fibonacci', 'golden', 'padovan', 'primes',
  'mandelbrot', 'lsystem', 'collatz', 'logistic', 'noise',
];

export default function ModulatorPanel({
  currentStep,
  complexity,
  onComplexityChange,
  activeModulator,
  onModulatorChange,
}: ModulatorPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
          Modulators
          <HelpTooltip
            title="Mathematical Modulators"
            technical="Secuencias matemáticas que controlan parámetros del audio en tiempo real. Cada step del secuenciador evalúa la función y aplica el resultado."
            beginner="Elige una fórmula matemática para que cambie automáticamente cómo suena la música. Cada fórmula produce un efecto diferente."
          />
        </h4>
        {activeModulator !== 'none' && (
          <button
            onClick={() => onModulatorChange('none')}
            className="text-[9px] uppercase tracking-widest text-black/40 hover:text-black border border-black/20 px-2 py-0.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Complexity slider */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest flex justify-between">
          <span>Complexity</span>
          <span className="font-mono">{complexity}</span>
        </span>
        <input
          type="range"
          min="1"
          max="20"
          value={complexity}
          onChange={(e) => onComplexityChange(parseInt(e.target.value))}
          className="accent-black"
        />
      </label>

      {/* Grid of modulator cards */}
      <div className="grid grid-cols-3 gap-1.5">
        {ALL_TYPES.map((type) => (
          <ModulatorCard
            key={type}
            type={type}
            active={activeModulator === type}
            currentStep={currentStep}
            complexity={complexity}
            onClick={() =>
              onModulatorChange(activeModulator === type ? 'none' : type)
            }
          />
        ))}
      </div>
    </div>
  );
}
