import React, { useEffect, useRef, useMemo } from 'react';
import type { SoundVector } from '../../types';
import { collatz, logisticMap } from '../../engine/math/sequences';

interface MathVisualizerProps {
  activeTab: 'collatz' | 'lsystem' | 'logistic' | 'fibonacci';
  vectors: SoundVector[];
  basePitch: number;
  selectedScale: string;
  activeNoteIdx: number | null;
  // Algorithm specific params
  collatzSeed: number;
  collatzSteps: number;
  lsystemPreset: 'algae' | 'tree' | 'koch' | 'cantor' | 'thueMorse';
  lsystemIterations: number;
  lsystemInterval: number;
  logisticX0: number;
  logisticR: number;
  logisticSteps: number;
  fibSteps: number;
  fibMode: 'spiral' | 'rhythm' | 'sequence';
  fibSeqType: 'standard' | 'lucas' | 'custom';
  customFibSequenceStr: string;
  fibPitchMode: 'wrap' | 'cumulative' | 'scaleWrap' | 'scaleCumulative';
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNoteName(p: number): string {
  const octave = Math.floor(p / 12) - 1;
  const name = NOTE_NAMES[p % 12];
  return `${name}${octave}`;
}

export default function MathVisualizer({
  activeTab,
  vectors,
  basePitch,
  selectedScale,
  activeNoteIdx,
  collatzSeed,
  collatzSteps,
  lsystemPreset,
  lsystemIterations,
  lsystemInterval,
  logisticX0,
  logisticR,
  logisticSteps,
  fibSteps,
  fibMode,
  fibSeqType,
  customFibSequenceStr,
  fibPitchMode,
}: MathVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-draw whenever data or active state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background with a sleek grid pattern
    ctx.fillStyle = '#111'; // Sleek dark brutalist dashboard style
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (activeTab === 'collatz') {
      drawCollatz(ctx, width, height);
    } else if (activeTab === 'lsystem') {
      drawLSystem(ctx, width, height);
    } else if (activeTab === 'logistic') {
      drawLogistic(ctx, width, height);
    } else if (activeTab === 'fibonacci') {
      drawFibonacci(ctx, width, height);
    }
  }, [
    activeTab,
    vectors,
    basePitch,
    selectedScale,
    activeNoteIdx,
    collatzSeed,
    collatzSteps,
    lsystemPreset,
    lsystemIterations,
    lsystemInterval,
    logisticX0,
    logisticR,
    logisticSteps,
    fibSteps,
    fibMode,
    fibSeqType,
    customFibSequenceStr,
    fibPitchMode,
  ]);

  // ----------------------------------------------------
  // COLLATZ VISUALIZATION: Orbit line plot + node points
  // ----------------------------------------------------
  const drawCollatz = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const numbers = collatz(collatzSeed).slice(0, collatzSteps);
    if (numbers.length === 0) return;

    const maxVal = Math.max(...numbers);
    const padding = 35;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Map points
    const points = numbers.map((n, i) => {
      const x = padding + (i / Math.max(1, numbers.length - 1)) * chartW;
      // Logarithmic scaling for better visualization of giant numbers
      const logN = Math.log(n + 1);
      const logMax = Math.log(maxVal + 1);
      const y = height - padding - (logN / logMax) * chartH;
      return { x, y, val: n };
    });

    // Draw connecting path
    ctx.strokeStyle = 'rgba(0, 170, 68, 0.6)'; // Neon emerald
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Draw dots and active highlight
    points.forEach((p, idx) => {
      const isActive = activeNoteIdx === idx;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isActive ? 6 : 3, 0, Math.PI * 2);

      // Color coding: Even numbers (divide by 2) are blue, Odd numbers (3n+1) are orange/red
      if (isActive) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
      } else {
        ctx.fillStyle = p.val % 2 === 0 ? '#0066CC' : '#FF6600';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw labels for active or key nodes
      if (isActive || (points.length < 25 && idx % 3 === 0) || idx === 0 || idx === points.length - 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(p.val.toString(), p.x, p.y - 8);

        // Draw note names under axis if active
        if (isActive && vectors[idx]) {
          ctx.fillStyle = '#FFD700'; // Gold note label
          ctx.fillText(midiToNoteName(vectors[idx].p), p.x, height - padding + 15);
        }
      }
    });

    // Subtitles and annotations
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`Semilla: ${collatzSeed} | Máx: ${maxVal}`, padding, padding - 10);
    ctx.fillText('Pasos de la Secuencia →', width - padding - 100, height - padding + 15);
  };

  // ----------------------------------------------------
  // L-SYSTEM VISUALIZATION: Recursive 2D Turtle Tree/Koch
  // ----------------------------------------------------
  const drawLSystem = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // We will generate the L-system code locally to trace it visually
    // or draw a beautiful visual fractal representing the preset.
    // LSystem rule implementation:
    const rulesMap: Record<string, string> = {
      algae: 'AB',
      tree: 'B[A]A',
      koch: 'ABBA',
      cantor: 'A[A',
      thueMorse: 'AB',
    };

    const rules = {
      algae: { A: 'AB', B: 'A' },
      tree: { A: 'B[A]A', B: 'BB' },
      koch: { A: 'ABBA', B: 'BBB' },
      cantor: { A: 'A[A', '[': '[[[' },
      thueMorse: { A: 'AB', B: 'BA' },
    };

    const activeRules = rules[lsystemPreset];
    let code = 'A';
    for (let i = 0; i < lsystemIterations; i++) {
      code = code
        .split('')
        .map((ch) => activeRules[ch as keyof typeof activeRules] ?? ch)
        .join('');
    }

    if (lsystemPreset === 'cantor') {
      // Draw Cantor Cantor Set segments stacked
      const padding = 40;
      const startY = 40;
      const laneH = (height - padding * 2) / Math.max(1, lsystemIterations + 1);

      ctx.strokeStyle = '#7700CC'; // Purple
      ctx.lineWidth = 4;

      const drawCantorLine = (x: number, y: number, len: number, level: number) => {
        if (level === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y);
          ctx.stroke();
        } else {
          const third = len / 3;
          drawCantorLine(x, y, third, level - 1);
          drawCantorLine(x + third * 2, y, third, level - 1);
        }
      };

      for (let level = 0; level <= lsystemIterations; level++) {
        const y = startY + level * laneH;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`Nivel ${level}`, 15, y + 3);

        ctx.strokeStyle = level === lsystemIterations ? '#00AA44' : 'rgba(119, 0, 204, 0.4)';
        drawCantorLine(padding + 20, y, width - padding * 2 - 20, level);
      }
      return;
    }

    // Turtle graphics
    // First pass: Compute bounding box to auto-center and auto-scale
    const stack: Array<{ x: number; y: number; angle: number }> = [];
    let state = { x: 0, y: 0, angle: -Math.PI / 2 };
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    // Use a fixed step size for bounds estimation
    const stepSize = 10;
    const rotAngle = (lsystemInterval * Math.PI) / 12; // dynamic angle

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char === 'F' || char === 'A' || char === 'B') {
        state.x += stepSize * Math.cos(state.angle);
        state.y += stepSize * Math.sin(state.angle);
        minX = Math.min(minX, state.x);
        maxX = Math.max(maxX, state.x);
        minY = Math.min(minY, state.y);
        maxY = Math.max(maxY, state.y);
      } else if (char === '+') {
        state.angle += rotAngle;
      } else if (char === '-') {
        state.angle -= rotAngle;
      } else if (char === '[') {
        stack.push({ ...state });
      } else if (char === ']') {
        const popped = stack.pop();
        if (popped) state = popped;
      }
    }

    // Scale and offsets to center fractal
    const boundsW = maxX - minX || 1;
    const boundsH = maxY - minY || 1;
    const scaleX = (width - 60) / boundsW;
    const scaleY = (height - 60) / boundsH;
    const scale = Math.min(100, Math.min(scaleX, scaleY)); // Cap max scale

    const centerX = (width - boundsW * scale) / 2 - minX * scale;
    const centerY = (height - boundsH * scale) / 2 - minY * scale;

    // Second pass: Draw
    ctx.strokeStyle = '#00AA44'; // Glowing neon green
    ctx.lineWidth = lsystemPreset === 'tree' ? 1.5 : 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00AA44';

    state = { x: centerX, y: centerY, angle: -Math.PI / 2 };
    stack.length = 0; // Clear stack

    let drawCount = 0;
    const activeNoteCount = vectors.length;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char === 'F' || char === 'A' || char === 'B') {
        const nextX = state.x + scale * stepSize * Math.cos(state.angle) / stepSize;
        const nextY = state.y + scale * stepSize * Math.sin(state.angle) / stepSize;

        // If this line segment maps to the currently playing note index
        const isNotePlaying = activeNoteIdx !== null && activeNoteIdx === drawCount % activeNoteCount;

        if (isNotePlaying) {
          ctx.strokeStyle = '#fff'; // Highlight segment playing
          ctx.lineWidth = 3.5;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#fff';
        } else {
          ctx.strokeStyle = lsystemPreset === 'tree' ? 'rgba(0, 170, 68, 0.7)' : 'rgba(255, 102, 0, 0.7)';
          ctx.lineWidth = lsystemPreset === 'tree' ? Math.max(1, 4 - stack.length) : 1.5;
          ctx.shadowBlur = 2;
          ctx.shadowColor = ctx.strokeStyle;
        }

        ctx.beginPath();
        ctx.moveTo(state.x, state.y);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        state.x = nextX;
        state.y = nextY;
        drawCount++;
      } else if (char === '+') {
        state.angle += rotAngle;
      } else if (char === '-') {
        state.angle -= rotAngle;
      } else if (char === '[') {
        stack.push({ ...state });
      } else if (char === ']') {
        const popped = stack.pop();
        if (popped) state = popped;
      }
    }

    ctx.shadowBlur = 0; // Reset shadow

    // Subtitles and annotations
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`Regla: ${lsystemPreset} | Iteraciones: ${lsystemIterations}`, 20, 20);
    ctx.fillText(`Código generado: ${code.slice(0, 20)}${code.length > 20 ? '...' : ''} (${code.length} chars)`, 20, 32);
  };

  // ----------------------------------------------------
  // LOGISTIC MAP VISUALIZATION: Cobweb Plot + Time Series
  // ----------------------------------------------------
  const drawLogistic = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const values = logisticMap(logisticX0, logisticR, logisticSteps);
    if (values.length === 0) return;

    // Divide canvas into:
    // Left: Time series (width * 0.5)
    // Right: Cobweb diagram square
    const leftW = width * 0.5;
    const padding = 30;

    // Draw Left: Time series
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(leftW - padding, height - padding);
    ctx.stroke();

    const tSeriesW = leftW - padding * 2;
    const tSeriesH = height - padding * 2;

    ctx.strokeStyle = '#FF6600'; // Chaos orange
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((val, i) => {
      const x = padding + (i / (values.length - 1)) * tSeriesW;
      const y = height - padding - val * tSeriesH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Trace dynamic playing dot on Left Time Series
    values.forEach((val, i) => {
      if (activeNoteIdx === i) {
        const x = padding + (i / (values.length - 1)) * tSeriesW;
        const y = height - padding - val * tSeriesH;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = '8px JetBrains Mono';
        ctx.fillText(`x[${i}]=${val.toFixed(3)}`, x - 15, y - 8);
      }
    });

    // Draw Right: Cobweb Plot
    const sqSide = Math.min(height - padding * 2, width * 0.45);
    const sqX = leftW + (width * 0.5 - sqSide) / 2;
    const sqY = padding;

    // Draw Cobweb Box bounding box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sqX, sqY, sqSide, sqSide);

    // Draw Diagonal line y = x
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(sqX, sqY + sqSide);
    ctx.lineTo(sqX + sqSide, sqY);
    ctx.stroke();

    // Draw Parabola: y = r * x * (1 - x)
    ctx.strokeStyle = '#0066CC'; // Blue parabola
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= sqSide; px++) {
      const xVal = px / sqSide;
      const yVal = logisticR * xVal * (1 - xVal);
      const canvasY = sqY + sqSide - yVal * sqSide;
      if (px === 0) ctx.moveTo(sqX + px, canvasY);
      else ctx.lineTo(sqX + px, canvasY);
    }
    ctx.stroke();

    // Draw Cobweb trajectory lines
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)'; // Translucent Gold
    ctx.lineWidth = 1;
    ctx.beginPath();

    let curX = logisticX0;
    ctx.moveTo(sqX + curX * sqSide, sqY + sqSide); // Start at (x0, 0)

    // Render paths up to the active note index (to keep it clean and interactive)
    // or all steps if inactive
    const stepsToRender = activeNoteIdx !== null ? activeNoteIdx + 1 : values.length;

    for (let i = 0; i < stepsToRender; i++) {
      const nextY = logisticR * curX * (1 - curX);
      // Vertical to parabola (curX, nextY)
      ctx.lineTo(sqX + curX * sqSide, sqY + sqSide - nextY * sqSide);
      // Horizontal to diagonal (nextY, nextY)
      ctx.lineTo(sqX + nextY * sqSide, sqY + sqSide - nextY * sqSide);
      curX = nextY;
    }
    ctx.stroke();

    // Draw dot for active cobweb state
    if (activeNoteIdx !== null && activeNoteIdx < values.length) {
      const val = values[activeNoteIdx];
      ctx.beginPath();
      ctx.arc(sqX + val * sqSide, sqY + sqSide - val * sqSide, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // Subtitles and annotations
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`Serie Temporal x_n`, padding, padding - 10);
    ctx.fillText(`Diagrama Telaraña (r = ${logisticR.toFixed(3)})`, sqX, sqY - 10);
  };

  // ----------------------------------------------------
  // FIBONACCI VISUALIZATION: Golden Spiral (Logarithmic) or Golden Angle Fermat Spiral
  // ----------------------------------------------------
  const drawFibonacci = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 20;
    const cX = width / 2;
    const cY = height / 2;

    if (fibMode === 'sequence') {
      const seqNumbers: number[] = [];
      if (fibSeqType === 'standard') {
        const getFib = (steps: number) => {
          const seq = [1, 1];
          for (let i = 2; i < steps; i++) seq.push(seq[i - 1] + seq[i - 2]);
          return seq.slice(0, steps);
        };
        seqNumbers.push(...getFib(fibSteps));
      } else if (fibSeqType === 'lucas') {
        const getLucas = (steps: number) => {
          const seq = [2, 1];
          for (let i = 2; i < steps; i++) seq.push(seq[i - 1] + seq[i - 2]);
          return seq.slice(0, steps);
        };
        seqNumbers.push(...getLucas(fibSteps));
      } else {
        const parsed = customFibSequenceStr
          .split(',')
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));
        if (parsed.length > 0) {
          seqNumbers.push(...parsed.slice(0, fibSteps));
        } else {
          const getFib = (steps: number) => {
            const seq = [1, 1];
            for (let i = 2; i < steps; i++) seq.push(seq[i - 1] + seq[i - 2]);
            return seq.slice(0, steps);
          };
          seqNumbers.push(...getFib(fibSteps));
        }
      }

      if (seqNumbers.length === 0) return;

      const GOLDEN_ANGLE = 2.39996323; // Radians for 137.5 degrees
      const maxVal = Math.max(...seqNumbers);
      const logMax = Math.log(maxVal + 1) || 1;
      const maxRadius = Math.min(width, height) / 2 - 40;

      const points = seqNumbers.map((val, i) => {
        const theta = i * GOLDEN_ANGLE;
        const logVal = Math.log(val + 1);
        const r = (logVal / logMax) * maxRadius;
        
        const x = cX + r * Math.cos(theta);
        const y = cY + r * Math.sin(theta);
        return { x, y, val, i };
      });

      // Draw connecting lines (geometric web)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)'; // Gold web
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw concentric circle guidelines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridLevels = [0.25, 0.5, 0.75, 1.0];
      gridLevels.forEach((level) => {
        ctx.beginPath();
        ctx.arc(cX, cY, maxRadius * level, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw nodes
      points.forEach((p, idx) => {
        const isActive = activeNoteIdx === idx;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 6.5 : 3.5, 0, Math.PI * 2);

        if (isActive) {
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
        } else {
          const progress = idx / points.length;
          ctx.fillStyle = `hsl(45, 100%, ${50 + progress * 20}%)`; // Gold to bright gold
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isActive || idx === 0 || idx === points.length - 1 || points.length < 15) {
          ctx.fillStyle = '#fff';
          ctx.font = '8px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(p.val.toString(), p.x, p.y - 7);

          if (isActive && vectors[idx]) {
            ctx.fillStyle = '#FFD700'; // Gold note label
            ctx.fillText(midiToNoteName(vectors[idx].p), p.x, p.y + 14);
          }
        }
      });

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(`Serie: ${fibSeqType === 'custom' ? 'Personalizada' : fibSeqType === 'lucas' ? 'Lucas' : 'Fibonacci'} | Máx: ${maxVal}`, 20, 20);
      ctx.fillText(`Mapeo: ${fibPitchMode} (Espiral de Ángulo Áureo)`, 20, 32);
      return;
    }

    // Draw spiral path
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)'; // Faint gold
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    // Spiral parameter r = a * e^(b * theta)
    const a = 3;
    const b = 0.30634; // Growth rate log(phi) / (pi / 2) for golden spiral

    const stepsCount = 180;
    const maxTheta = (fibSteps * Math.PI) / 2.5; // spiral length fits size
    
    // Auto-scale depending on steps
    const scaleFactor = Math.min(25, (Math.min(width, height) - 40) / (2 * a * Math.exp(b * maxTheta)));

    for (let i = 0; i <= stepsCount; i++) {
      const theta = (i / stepsCount) * maxTheta;
      const r = a * Math.exp(b * theta) * scaleFactor;
      const x = cX + r * Math.cos(theta);
      const y = cY + r * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Plot nodes on the spiral for notes
    for (let i = 0; i < fibSteps; i++) {
      const theta = (i * Math.PI) / 2.5;
      const r = a * Math.exp(b * theta) * scaleFactor;
      const x = cX + r * Math.cos(theta);
      const y = cY + r * Math.sin(theta);

      const isActive = activeNoteIdx === i;

      // Draw lines to center to form coordinates
      ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(cX, cY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, isActive ? 6 : 3.5, 0, Math.PI * 2);

      if (isActive) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
      } else {
        ctx.fillStyle = '#FFD700'; // Solid gold dots
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Write details next to active dot
      if (isActive && vectors[i]) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`Nota: ${midiToNoteName(vectors[i].p)}`, x + 10, y - 2);
        ctx.fillText(`Radio: ${r.toFixed(0)}px`, x + 10, y + 8);
      }
    }

    // Subtitles and annotations
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`Modo: ${fibMode === 'spiral' ? 'Espiral Logarítmica Áurea' : 'Ritmo de Golpes Fibonacci'}`, 20, 20);
    ctx.fillText(`Razón: φ ≈ 1.618 (Proporción Divina)`, 20, 32);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="w-full border border-black/30 rounded-sm"
        style={{ height: '240px', cursor: 'crosshair' }}
      />
    </div>
  );
}
