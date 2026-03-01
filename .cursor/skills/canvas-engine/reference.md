# Referencia — Canvas Engine

## Lógica de Grafos para Conexiones entre Sonidos

### Grafo dirigido ponderado

Modelar conexiones entre sonidos (ej: un sonido "dispara" otro, o controla sus parámetros):

```typescript
class SoundGraph {
  private adjacency: Map<string, Map<string, number>> = new Map();

  addNode(id: string) {
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, new Map());
    }
  }

  addEdge(from: string, to: string, weight = 1) {
    this.addNode(from);
    this.addNode(to);
    this.adjacency.get(from)!.set(to, weight);
  }

  removeEdge(from: string, to: string) {
    this.adjacency.get(from)?.delete(to);
  }

  getNeighbors(id: string): Array<{ id: string; weight: number }> {
    const edges = this.adjacency.get(id);
    if (!edges) return [];
    return Array.from(edges.entries()).map(([id, weight]) => ({ id, weight }));
  }

  // Recorrer grafo en orden topológico (para cadena de procesamiento)
  topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      for (const { id } of this.getNeighbors(node)) {
        dfs(id);
      }
      result.unshift(node);
    };

    for (const node of this.adjacency.keys()) {
      dfs(node);
    }
    return result;
  }
}
```

### Caso de uso: cadena de efectos como grafo

```
[GrainPlayer] → [Filter] → [Delay] → [Reverb] → [Output]
                    ↑
               [LFO (noise)]
```

Cada nodo es un `SoundVector` o un procesador. Las aristas definen el routing de audio.

## Geometría Analítica — Fórmulas extendidas

### Distancia entre SoundVectors

```typescript
function distance(a: SoundVector, b: SoundVector): number {
  const dt = (a.t - b.t) / 1000;  // normalizar ms a segundos
  const dp = a.p - b.p;            // diferencia en MIDI notes
  return Math.sqrt(dt * dt + dp * dp);
}
```

### Centroide de un grupo

```typescript
function centroid(nodes: SoundVector[]): { t: number; p: number } {
  const n = nodes.length;
  return {
    t: nodes.reduce((s, v) => s + v.t, 0) / n,
    p: nodes.reduce((s, v) => s + v.p, 0) / n,
  };
}
```

### Bounding box

```typescript
function boundingBox(nodes: SoundVector[]): {
  minT: number; maxT: number; minP: number; maxP: number;
} {
  return {
    minT: Math.min(...nodes.map(v => v.t)),
    maxT: Math.max(...nodes.map(v => v.t + v.duration)),
    minP: Math.min(...nodes.map(v => v.p)),
    maxP: Math.max(...nodes.map(v => v.p)),
  };
}
```

## PixiJS 8 — Optimizaciones de rendimiento

### Pool de objetos para miles de micro-samples

```typescript
class GraphicsPool {
  private pool: Graphics[] = [];
  private active: Graphics[] = [];

  acquire(): Graphics {
    const g = this.pool.pop() || new Graphics();
    this.active.push(g);
    return g;
  }

  releaseAll() {
    for (const g of this.active) {
      g.clear();
      g.removeFromParent();
      this.pool.push(g);
    }
    this.active = [];
  }
}
```

### Culling (no renderizar lo que no se ve)

```typescript
function isVisible(
  v: SoundVector,
  viewport: { x: number; y: number; width: number; height: number },
  pixelsPerMs: number,
  pixelsPerNote: number
): boolean {
  const x = v.t * pixelsPerMs;
  const y = (127 - v.p) * pixelsPerNote;
  const w = v.duration * pixelsPerMs;
  const h = pixelsPerNote;

  return !(
    x + w < viewport.x ||
    x > viewport.x + viewport.width ||
    y + h < viewport.y ||
    y > viewport.y + viewport.height
  );
}
```

### ParticleContainer para grains

Cuando hay >10,000 micro-samples, usar `ParticleContainer`:

```typescript
import { ParticleContainer, Sprite, Texture } from 'pixi.js';

const grainTexture = Texture.from('grain-dot.png'); // 4x4 pixel
const particles = new ParticleContainer(50000, {
  vertices: true,
  position: true,
  tint: true,
});

function renderGrains(grains: SoundVector[]) {
  particles.removeChildren();
  for (const g of grains) {
    const sprite = new Sprite(grainTexture);
    sprite.x = g.t * pixelsPerMs;
    sprite.y = (127 - g.p) * pixelsPerNote;
    sprite.alpha = g.velocity;
    particles.addChild(sprite);
  }
}
```

## Función Sigmoide — Variantes

### Sigmoide estándar
\( \sigma(x) = \frac{1}{1 + e^{-x}} \)

### Sigmoide parametrizada
\( \sigma(x; k, x_0) = \frac{1}{1 + e^{-k(x - x_0)}} \)

- `k` controla la pendiente (mayor k = transición más brusca)
- `x_0` es el punto de inflexión

### Tangente hiperbólica (alternativa bipolar)
\( \tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}} \)

Rango: [-1, 1] en lugar de [0, 1]. Útil para distribuir grains simétricamente.

### Softmax para múltiples pistas

```typescript
function softmax(values: number[], temperature = 1): number[] {
  const scaled = values.map(v => Math.exp(v / temperature));
  const sum = scaled.reduce((a, b) => a + b, 0);
  return scaled.map(v => v / sum);
}
```
