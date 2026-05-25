import React, { useMemo } from 'react';
import type { ModulatorType } from '../../types';
import MathGraph from './MathGraph';
import HelpTooltip from '../shared/HelpTooltip';
import {
  fibonacci,
  padovan,
  collatz,
  logisticMap,
  primesUpTo,
  goldenSpiral,
  noise1D,
} from '../../engine/math/sequences';

interface ModulatorCardProps {
  key?: any;
  type: ModulatorType;
  active: boolean;
  currentStep: number;
  complexity: number;
  onClick: () => void;
}

interface ModDef {
  name: string;
  formula: string;
  help: { title: string; technical: string; beginner: string };
  generateValues: (complexity: number) => number[];
  graphType: 'line' | 'bar' | 'spiral';
}

const MODULATOR_DEFS: Record<ModulatorType, ModDef> = {
  fibonacci: {
    name: 'Fibonacci',
    formula: 'F(n) = F(n-1) + F(n-2)',
    help: {
      title: 'Fibonacci',
      technical: 'Secuencia donde cada término es la suma de los dos anteriores. Ratio converge a φ ≈ 1.618.',
      beginner: 'Los números 1, 1, 2, 3, 5, 8, 13... cambian el sonido de forma orgánica, como crecen las ramas de un árbol.',
    },
    generateValues: (c) => Array.from({ length: c }, (_, i) => fibonacci(i + 1)),
    graphType: 'spiral',
  },
  golden: {
    name: 'Golden Ratio',
    formula: 'φⁿ × base',
    help: {
      title: 'Golden Ratio',
      technical: 'Progresión geométrica con ratio φ = 1.618..., la proporción áurea.',
      beginner: 'El filtro sigue la misma proporción que los girasoles. El sonido se abre siguiendo una espiral natural.',
    },
    generateValues: (c) => Array.from({ length: c }, (_, i) => goldenSpiral(i + 1)),
    graphType: 'spiral',
  },
  padovan: {
    name: 'Padovan',
    formula: 'P(n) = P(n-2) + P(n-3)',
    help: {
      title: 'Padovan Sequence',
      technical: 'Secuencia con ratio plástico p ≈ 1.3247. Crecimiento más lento que Fibonacci.',
      beginner: 'Parecida a Fibonacci pero crece más despacio. Produce cambios más sutiles y graduales en el sonido.',
    },
    generateValues: (c) => Array.from({ length: c }, (_, i) => padovan(i + 1)),
    graphType: 'line',
  },
  primes: {
    name: 'Primes',
    formula: '2, 3, 5, 7, 11...',
    help: {
      title: 'Prime Numbers',
      technical: 'Números divisibles solo por 1 y sí mismos. Distribución pseudo-aleatoria con estructura oculta.',
      beginner: 'Los números primos no siguen un patrón obvio — generan ritmos que parecen aleatorios pero tienen orden escondido.',
    },
    generateValues: (c) => primesUpTo(Math.max(c * 10, 20)),
    graphType: 'bar',
  },
  mandelbrot: {
    name: 'Mandelbrot',
    formula: 'z² + c iterations',
    help: {
      title: 'Mandelbrot',
      technical: 'Iteraciones del mapa z → z² + c en el plano complejo. Densidad rítmica según velocidad de divergencia.',
      beginner: 'El famoso fractal convertido en ritmo. Zonas complejas del fractal = ritmos complejos.',
    },
    generateValues: (c) => {
      const vals: number[] = [];
      for (let i = 0; i < c; i++) {
        let zx = 0, zy = 0;
        const cx = -2 + (i / c) * 2.5;
        let iter = 0;
        while (zx * zx + zy * zy < 4 && iter < 40) {
          const tmp = zx * zx - zy * zy + cx;
          zy = 2 * zx * zy;
          zx = tmp;
          iter++;
        }
        vals.push(iter);
      }
      return vals;
    },
    graphType: 'bar',
  },
  lsystem: {
    name: 'L-System',
    formula: 'Axiom → Rules × n',
    help: {
      title: 'L-System',
      technical: 'Gramática de Lindenmayer con reescritura paralela. Genera secuencias auto-similares.',
      beginner: 'Reglas que se aplican una y otra vez, como un árbol que ramifica. Cada iteración añade más detalle.',
    },
    generateValues: (c) => {
      let s = 'A';
      const rules: Record<string, string> = { A: 'AB', B: 'A' };
      for (let i = 0; i < Math.min(c, 6); i++) {
        s = s.split('').map((ch) => rules[ch] ?? ch).join('');
      }
      return s.split('').map((ch) => (ch === 'A' ? 1 : 0.5));
    },
    graphType: 'bar',
  },
  collatz: {
    name: 'Collatz',
    formula: 'n/2 or 3n+1',
    help: {
      title: 'Collatz Conjecture',
      technical: 'Si n es par: n/2. Si impar: 3n+1. Siempre llega a 1 (conjetura no demostrada). Trayectoria caótica.',
      beginner: 'Una fórmula simple que genera caminos locos: los números suben y bajan de forma impredecible antes de llegar a 1.',
    },
    generateValues: (c) => collatz(Math.max(c * 3, 7)),
    graphType: 'line',
  },
  logistic: {
    name: 'Logistic Map',
    formula: 'xₙ₊₁ = r·xₙ(1-xₙ)',
    help: {
      title: 'Logistic Map',
      technical: 'Mapa logístico con parámetro r. Para r > 3.57 el sistema es caótico. Usado como fuente de caos determinista.',
      beginner: 'Una ecuación simple que puede ser ordenada o completamente caótica según un solo parámetro. Caos controlado.',
    },
    generateValues: (c) => logisticMap(0.5, 3.7, Math.max(c, 10)),
    graphType: 'line',
  },
  noise: {
    name: 'Noise',
    formula: 'sin(x)·sin(2.1x)·sin(3.72x)',
    help: {
      title: 'Pseudo-Noise',
      technical: 'Producto de senos con frecuencias irracionales entre sí. Genera variación orgánica sin repetición exacta.',
      beginner: 'Como el viento: nunca sopla exactamente igual. Hace que el sonido cambie de forma natural e impredecible.',
    },
    generateValues: (c) => Array.from({ length: c }, (_, i) => noise1D(i * 0.5)),
    graphType: 'line',
  },
};

export default function ModulatorCard({
  type,
  active,
  currentStep,
  complexity,
  onClick,
}: ModulatorCardProps): React.ReactElement {
  const def = MODULATOR_DEFS[type];
  const values = useMemo(() => def.generateValues(Math.max(complexity, 8)), [def, complexity]);
  const stepIdx = currentStep % Math.max(values.length, 1);

  return (
    <button
      onClick={onClick}
      className={`border p-2 text-left transition-colors flex flex-col gap-1.5 ${
        active
          ? 'border-black bg-black/5'
          : 'border-black/15 hover:border-black/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase">{def.name}</span>
        <HelpTooltip {...def.help} />
      </div>
      <span className="font-mono text-[9px] text-black/40">{def.formula}</span>
      <MathGraph
        values={values}
        currentIndex={active ? stepIdx : undefined}
        width={120}
        height={40}
        type={def.graphType}
      />
    </button>
  );
}
