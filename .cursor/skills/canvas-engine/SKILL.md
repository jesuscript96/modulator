---
name: canvas-engine
description: Motor de pizarra tipo Ableton basado en geometría analítica y grafos para posicionar y transformar sonidos como vectores V=(t,p). Renderiza timeline con PixiJS y aplica transformaciones afines (rotación, escala, traslación) a estructuras musicales completas. Use cuando el usuario pida crear timeline, pizarra de audio, mover sonidos en canvas, transformaciones geométricas de pistas, o visualización tipo DAW.
---

# Arquitectura de Pista por Geometría — Canvas Engine

## Contexto

Cada sonido en la pizarra es un vector \( V = (t, p) \) donde \( t \) es tiempo (ms) y \( p \) es pitch (Hz o MIDI note). El motor permite aplicar transformaciones afines a toda una estructura musical: rotar, escalar, trasladar y comprimir geométricamente.

## Dependencias

```bash
npm install pixi.js
```

- **PixiJS 8**: Renderizado WebGL/WebGPU de alto rendimiento para miles de elementos.

## Modelo de Datos

### SoundVector — la unidad fundamental

```typescript
interface SoundVector {
  id: string;
  t: number;        // tiempo en ms desde inicio
  p: number;        // pitch en MIDI note (0-127)
  duration: number;  // duración en ms
  velocity: number;  // 0-1
  sourceId: string;  // referencia al sample/synth
  color?: string;
}

interface SoundGraph {
  nodes: SoundVector[];
  connections: { from: string; to: string; weight: number }[];
}
```

### Transformaciones Afines

Una transformación afín en 2D se representa como matriz 3×3:

\[
\begin{bmatrix} t' \\ p' \\ 1 \end{bmatrix} = 
\begin{bmatrix} a & b & tx \\ c & d & ty \\ 0 & 0 & 1 \end{bmatrix}
\begin{bmatrix} t \\ p \\ 1 \end{bmatrix}
\]

```typescript
type AffineMatrix = [number, number, number, number, number, number];
// [a, b, c, d, tx, ty]

function applyAffine(v: SoundVector, m: AffineMatrix): SoundVector {
  const [a, b, c, d, tx, ty] = m;
  return {
    ...v,
    t: a * v.t + b * v.p + tx,
    p: c * v.t + d * v.p + ty,
  };
}

function applyToAll(nodes: SoundVector[], m: AffineMatrix): SoundVector[] {
  return nodes.map(v => applyAffine(v, m));
}
```

### Transformaciones predefinidas

```typescript
const Transforms = {
  // Escala temporal: comprimir/expandir en tiempo
  timeScale: (factor: number): AffineMatrix =>
    [factor, 0, 0, 1, 0, 0],

  // Escala de pitch: transponer proporcionalmente
  pitchScale: (factor: number): AffineMatrix =>
    [1, 0, 0, factor, 0, 0],

  // Traslación: mover en tiempo y pitch
  translate: (dt: number, dp: number): AffineMatrix =>
    [1, 0, 0, 1, dt, dp],

  // Rotación: rotar la estructura musical (t↔p)
  rotate: (angleDeg: number): AffineMatrix => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [cos, -sin, sin, cos, 0, 0];
  },

  // Reflexión temporal (retrogradación)
  retrograde: (maxT: number): AffineMatrix =>
    [-1, 0, 0, 1, maxT, 0],

  // Inversión de pitch
  inversion: (axisPitch: number): AffineMatrix =>
    [1, 0, 0, -1, 0, 2 * axisPitch],

  // Composición de transformaciones
  compose: (a: AffineMatrix, b: AffineMatrix): AffineMatrix => {
    const [a0,a1,a2,a3,a4,a5] = a;
    const [b0,b1,b2,b3,b4,b5] = b;
    return [
      a0*b0 + a1*b2, a0*b1 + a1*b3,
      a2*b0 + a3*b2, a2*b1 + a3*b3,
      a0*b4 + a1*b5 + a4, a2*b4 + a3*b5 + a5
    ];
  }
};
```

## Renderizado con PixiJS

### Timeline Canvas

```typescript
import { Application, Container, Graphics, Text } from 'pixi.js';

class TimelineCanvas {
  private app: Application;
  private container: Container;
  private zoom = { x: 1, y: 1 };
  private pan = { x: 0, y: 0 };
  private pixelsPerMs = 0.1;
  private pixelsPerNote = 8;

  async init(canvasElement: HTMLCanvasElement) {
    this.app = new Application();
    await this.app.init({
      canvas: canvasElement,
      width: canvasElement.clientWidth,
      height: canvasElement.clientHeight,
      backgroundColor: 0xf4f4f0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });

    this.container = new Container();
    this.app.stage.addChild(this.container);
    this.setupInteraction();
  }

  render(nodes: SoundVector[]) {
    this.container.removeChildren();

    for (const v of nodes) {
      const g = new Graphics();
      const x = v.t * this.pixelsPerMs * this.zoom.x + this.pan.x;
      const y = (127 - v.p) * this.pixelsPerNote * this.zoom.y + this.pan.y;
      const w = v.duration * this.pixelsPerMs * this.zoom.x;
      const h = this.pixelsPerNote * this.zoom.y;

      g.rect(x, y, Math.max(w, 2), h);
      g.fill({ color: 0x111111, alpha: v.velocity });
      g.stroke({ color: 0x000000, width: 0.5 });

      this.container.addChild(g);
    }
  }

  private setupInteraction() {
    // Zoom con rueda del ratón
    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      if (e.shiftKey) {
        this.zoom.y *= factor;
      } else {
        this.zoom.x *= factor;
      }
    });

    // Pan con arrastrar
    let dragging = false;
    let lastPos = { x: 0, y: 0 };
    this.app.canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastPos = { x: e.clientX, y: e.clientY };
    });
    this.app.canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.pan.x += e.clientX - lastPos.x;
      this.pan.y += e.clientY - lastPos.y;
      lastPos = { x: e.clientX, y: e.clientY };
    });
    this.app.canvas.addEventListener('pointerup', () => { dragging = false; });
  }

  applyTransform(nodes: SoundVector[], transform: AffineMatrix): SoundVector[] {
    return applyToAll(nodes, transform);
  }

  destroy() {
    this.app.destroy(true);
  }
}
```

### Visualización con Función Sigmoide

Para mover miles de micro-samples (granular) sin latencia, usar posicionamiento sigmoide:

```typescript
function sigmoid(x: number, k = 1, x0 = 0): number {
  return 1 / (1 + Math.exp(-k * (x - x0)));
}

// Posicionar N micro-grains en curva sigmoide
function distributeGrains(
  grains: SoundVector[],
  startT: number,
  endT: number,
  steepness = 5
): SoundVector[] {
  const range = endT - startT;
  return grains.map((g, i) => {
    const normalized = i / (grains.length - 1); // 0..1
    const t = startT + sigmoid(normalized * 10 - 5, steepness) * range;
    return { ...g, t };
  });
}
```

## Integración con React

```tsx
import { useRef, useEffect } from 'react';

function TimelineView({ nodes, transform }: {
  nodes: SoundVector[];
  transform?: AffineMatrix;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TimelineCanvas>();

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new TimelineCanvas();
    engine.init(canvasRef.current);
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    const displayed = transform
      ? engineRef.current.applyTransform(nodes, transform)
      : nodes;
    engineRef.current.render(displayed);
  }, [nodes, transform]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-64 border border-black"
    />
  );
}
```

## Operaciones Musicales como Geometría

| Operación Musical | Transformación Geométrica | Matriz |
|---|---|---|
| Transposición | Traslación en Y | `translate(0, n)` |
| Desplazar en tiempo | Traslación en X | `translate(dt, 0)` |
| Retrogradación | Reflexión en X | `retrograde(maxT)` |
| Inversión | Reflexión en Y | `inversion(axis)` |
| Augmentación | Escala en X | `timeScale(2)` |
| Disminución | Escala en X | `timeScale(0.5)` |
| Rotación tiempo↔pitch | Rotación | `rotate(angle)` |

## Recursos

- Para lógica de grafos avanzada (Nodes.io style), ver [reference.md](reference.md)
