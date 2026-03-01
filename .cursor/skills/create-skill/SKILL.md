---
name: create-skill
description: Crea nuevas Agent Skills para el proyecto Modulator (Audio Geometria). Usa cuando el usuario pida crear, escribir o añadir una nueva skill, o cuando surjan nuevas capacidades de procesamiento de audio, síntesis o visualización que deban persistir como conocimiento reutilizable.
---

# Crear Skills para Modulator

## Contexto del Proyecto

Modulator (Audio Geometria) es una aplicación web de síntesis algorítmica construida con:
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Tone.js 15** para audio (granular, sintetizadores, efectos)
- **Tailwind CSS 4** para estilos
- **PixiJS** (visualización), **Meyda** (análisis), **Essentia.js** (espectral)

## Instrucciones

### 1. Estructura de una Skill

```
.cursor/skills/nombre-skill/
├── SKILL.md           # Obligatorio — instrucciones principales (<500 líneas)
├── reference.md       # Opcional — documentación detallada
├── examples.md        # Opcional — ejemplos de uso
└── scripts/           # Opcional — utilidades ejecutables
```

### 2. Frontmatter YAML obligatorio

```yaml
---
name: nombre-en-minusculas-con-guiones  # max 64 chars
description: Descripción concisa en tercera persona. Incluir QUÉ hace y CUÁNDO usarla.
---
```

### 3. Principios de redacción

- **Conciso**: El agente ya es inteligente. Solo añadir conocimiento que no tenga.
- **Específico al dominio audio**: Incluir fórmulas matemáticas, nombres de algoritmos, librerías concretas.
- **Código TypeScript**: Todo ejemplo debe ser compatible con el stack (Tone.js, Web Audio API, TypeScript).
- **Progressive disclosure**: Lo esencial en SKILL.md, lo detallado en archivos de referencia.

### 4. Convenciones de nombres

| Dominio | Prefijo sugerido |
|---------|-----------------|
| Procesamiento espectral | `spectral-` |
| Síntesis/efectos | `synth-` o `fx-` |
| Ritmos/secuenciación | `rhythm-` |
| Visualización | `viz-` |
| Análisis | `analysis-` |
| Motor/engine | `engine-` |

### 5. Workflow

1. **Descubrir**: Identificar el propósito, librerías necesarias y triggers.
2. **Diseñar**: Definir nombre, descripción, secciones y si necesita scripts.
3. **Implementar**: Crear archivos en `.cursor/skills/nombre-skill/`.
4. **Verificar**: SKILL.md < 500 líneas, descripción específica, terminología consistente.

### 6. Plantilla rápida

```markdown
---
name: mi-nueva-skill
description: [Qué hace] [Cuándo usarla]. Use cuando el usuario pida [trigger].
---

# Nombre de la Skill

## Contexto
Breve descripción del problema que resuelve.

## Dependencias
- `npm install libreria-x` — para qué sirve

## Implementación

### Paso 1: [Título]
Código o instrucciones concretas.

### Paso 2: [Título]
...

## Integración con AudioEngine
Cómo conectar con `src/AudioEngine.ts` y el flujo existente de Tone.js.

## Matemática
Fórmulas y algoritmos clave (usar LaTeX inline con \( y \)).
```

## Ejemplo: Crear skill de reverberación convolucional

```bash
# Estructura
.cursor/skills/fx-convolution-reverb/
├── SKILL.md
└── reference.md
```

SKILL.md incluiría: uso de `Tone.Convolver`, carga de impulse responses, integración con la cadena `filter → delay → reverb` existente en `AudioEngine.ts`.
