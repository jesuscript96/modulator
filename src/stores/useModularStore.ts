import { create } from 'zustand';
import type { ModularModule, ModularCable, ModularJack } from '../types';

interface ModularState {
  modules: ModularModule[];
  cables: ModularCable[];
  addModule: (module: ModularModule) => void;
  removeModule: (id: string) => void;
  updateModuleParams: (id: string, params: Partial<Record<string, number>>) => void;
  updateModuleScript: (id: string, scriptCode: string) => void;
  addCable: (cable: ModularCable) => void;
  removeCable: (id: string) => void;
  clearModularSandbox: () => void;
}

export const useModularStore = create<ModularState>((set) => ({
  modules: [
    // Pre-populate with a basic template to make it easy to start
    {
      id: 'module-synth-1',
      type: 'synth',
      name: 'PolySynth Engine',
      x: 350,
      y: 100,
      params: {
        type: 0, // 0: triangle, 1: celestial, 2: violin, 3: guitar
        basePitch: 60, // MIDI C4
        volume: -10,
      },
      inputs: [
        { id: 'module-synth-1-input-pitch', moduleId: 'module-synth-1', label: 'Pitch CV', type: 'in', paramName: 'pitch' },
        { id: 'module-synth-1-input-gate', moduleId: 'module-synth-1', label: 'Gate (Trig)', type: 'in', paramName: 'gate' },
        { id: 'module-synth-1-input-cutoff', moduleId: 'module-synth-1', label: 'Filter CV', type: 'in', paramName: 'cutoff' },
      ],
      outputs: [
        { id: 'module-synth-1-output-audio', moduleId: 'module-synth-1', label: 'Audio Out', type: 'out', paramName: 'audio' },
      ],
    },
    {
      id: 'module-modulator-1',
      type: 'modulator',
      name: 'Fibonacci LFO',
      x: 50,
      y: 100,
      params: {
        type: 0, // fibonacci
        complexity: 5,
        attenuation: 0.8,
      },
      inputs: [],
      outputs: [
        { id: 'module-modulator-1-output-val', moduleId: 'module-modulator-1', label: 'CV Out', type: 'out', paramName: 'value' },
      ],
    },
    {
      id: 'module-scope-1',
      type: 'scope',
      name: 'Signal Scope',
      x: 650,
      y: 100,
      params: {
        speed: 1,
      },
      inputs: [
        { id: 'module-scope-1-input-audio', moduleId: 'module-scope-1', label: 'Audio In', type: 'in', paramName: 'audio' },
        { id: 'module-scope-1-input-cv', moduleId: 'module-scope-1', label: 'CV In', type: 'in', paramName: 'cv' },
      ],
      outputs: [],
    }
  ],
  cables: [],

  addModule: (module) =>
    set((state) => ({ modules: [...state.modules, module] })),

  removeModule: (id) =>
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id),
      cables: state.cables.filter((c) => {
        const fromPort = state.modules.find((m) => m.id === id)?.outputs.some((o) => o.id === c.fromPortId);
        const toPort = state.modules.find((m) => m.id === id)?.inputs.some((i) => i.id === c.toPortId);
        return !fromPort && !toPort;
      }),
    })),

  updateModuleParams: (id, params) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === id ? { ...m, params: { ...m.params, ...params } } : m
      ),
    })),

  updateModuleScript: (id, scriptCode) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === id ? { ...m, scriptCode } : m
      ),
    })),

  addCable: (cable) =>
    set((state) => {
      // Remove any cable already connected to the same input port (monophonic patching)
      const filteredCables = state.cables.filter((c) => c.toPortId !== cable.toPortId);
      return { cables: [...filteredCables, cable] };
    }),

  removeCable: (id) =>
    set((state) => ({ cables: state.cables.filter((c) => c.id !== id) })),

  clearModularSandbox: () => set({ modules: [], cables: [] }),
}));
