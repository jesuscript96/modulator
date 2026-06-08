import { create } from 'zustand';
import { db, type ProjectData, type ClipData, type LabClipData } from '../lib/db';
import { useProjectStore } from './useProjectStore';
import { useDrumsStore } from './useDrumsStore';
import { useModularStore } from './useModularStore';
import { audioBufferToWav } from '../engine/ExportEngine';
import * as Tone from 'tone';

interface SyncState {
  savedProjects: ProjectData[];
  loading: boolean;
  currentProjectId: string | null;
  currentProjectName: string | null;
  
  loadSavedProjects: () => Promise<void>;
  saveProject: (name: string) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  createNewProject: () => void;
  deleteProject: (projectId: string) => Promise<void>;
  exportProjectToFile: (projectId: string) => Promise<void>;
  importProjectFromFile: (file: File) => Promise<void>;
}

// Helper to convert Blob to Base64 Data URL for JSON export
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to convert Base64 Data URL back to Blob
const base64ToBlob = async (base64DataUrl: string): Promise<Blob> => {
  const res = await fetch(base64DataUrl);
  return await res.blob();
};

export const useSyncStore = create<SyncState>((set, get) => ({
  savedProjects: [],
  loading: false,
  currentProjectId: null,
  currentProjectName: null,

  loadSavedProjects: async () => {
    const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({ savedProjects: projects });
  },

  saveProject: async (name) => {
    set({ loading: true });
    try {
      const projectState = useProjectStore.getState();
      const drumsState = useDrumsStore.getState();
      const modularState = useModularStore.getState();

      const projectId = get().currentProjectId || crypto.randomUUID();
      const timestamp = Date.now();

      // 1. Prepare Serialized states
      const serializedDrums = {
        patterns: drumsState.patterns,
        synthParams: drumsState.synthParams,
        lfoParams: drumsState.lfoParams,
        modulations: drumsState.modulations,
        mixerParams: drumsState.mixerParams,
        bpm: drumsState.bpm,
      };

      const serializedModular = {
        modules: modularState.modules,
        cables: modularState.cables,
      };

      // 2. Save Project Metadata & Settings
      const projectData: ProjectData = {
        id: projectId,
        name: name || get().currentProjectName || 'Mi Canción Geométrica',
        createdAt: timestamp, // Fallback if new, update projects logic handles it
        updatedAt: timestamp,
        bpm: projectState.bpm,
        lanes: projectState.lanes,
        boardPlaybackMode: projectState.boardPlaybackMode,
        synthType: projectState.synthType,
        synthSettings: projectState.synthSettings,
        transform: projectState.transform,
        drumsState: serializedDrums,
        modularState: serializedModular,
      };

      // Check if project already exists to preserve its createdAt
      const existingProject = await db.projects.get(projectId);
      if (existingProject) {
        projectData.createdAt = existingProject.createdAt;
      }

      await db.projects.put(projectData);

      // 3. Clear old clips for this project
      await db.clips.where({ projectId }).delete();
      await db.labClips.where({ projectId }).delete();

      // 4. Save clips and generate WAV Blobs
      for (const clip of projectState.clips) {
        if (!clip.audioBuffer) continue;
        const wavBlob = audioBufferToWav(clip.audioBuffer);
        
        const clipData: ClipData = {
          id: clip.id,
          projectId,
          name: clip.name,
          lane: clip.lane,
          startTime: clip.startTime,
          duration: clip.duration,
          modulators: clip.modulators,
          vectors: clip.vectors,
          audioBlob: wavBlob,
        };
        await db.clips.put(clipData);
      }

      // 5. Save labClips and generate WAV Blobs
      for (const labClip of projectState.labClips) {
        if (!labClip.audioBuffer) continue;
        const wavBlob = audioBufferToWav(labClip.audioBuffer);

        const labClipData: LabClipData = {
          id: labClip.id,
          projectId,
          name: labClip.name,
          type: labClip.type,
          duration: labClip.duration,
          sampleRate: labClip.sampleRate,
          createdAt: labClip.createdAt,
          vectors: labClip.vectors,
          audioBlob: wavBlob,
        };
        await db.labClips.put(labClipData);
      }

      set({ 
        currentProjectId: projectId, 
        currentProjectName: projectData.name,
        loading: false 
      });
      await get().loadSavedProjects();
      return projectId;
    } catch (error) {
      set({ loading: false });
      console.error('Error saving project:', error);
      throw error;
    }
  },

  loadProject: async (projectId) => {
    set({ loading: true });
    try {
      const project = await db.projects.get(projectId);
      if (!project) {
        throw new Error('Proyecto no encontrado en la base de datos local');
      }

      // 1. Fetch clips and labClips from database
      const dbClips = await db.clips.where({ projectId }).toArray();
      const dbLabClips = await db.labClips.where({ projectId }).toArray();

      // Get Web Audio AudioContext (use Tone's context)
      const audioCtx = (Tone.getContext().rawContext || new (window.AudioContext || (window as any).webkitAudioContext)()) as AudioContext;

      // 2. Helper to decode Blob to AudioBuffer
      const decodeBlob = async (blob: Blob): Promise<AudioBuffer> => {
        const arrayBuffer = await blob.arrayBuffer();
        // Decode audio data (returns a promise in modern browsers)
        return await audioCtx.decodeAudioData(arrayBuffer);
      };

      // 3. Reconstruct Clip objects
      const reconstructedClips = [];
      for (const c of dbClips) {
        try {
          const buffer = await decodeBlob(c.audioBlob);
          reconstructedClips.push({
            id: c.id,
            name: c.name,
            lane: c.lane,
            startTime: c.startTime,
            duration: c.duration,
            modulators: c.modulators || [],
            vectors: c.vectors || [],
            audioBuffer: buffer,
          });
        } catch (err) {
          console.error(`Error decoding clip ${c.name}:`, err);
        }
      }

      // 4. Reconstruct LabClip objects
      const reconstructedLabClips = [];
      for (const lc of dbLabClips) {
        try {
          const buffer = await decodeBlob(lc.audioBlob);
          reconstructedLabClips.push({
            id: lc.id,
            name: lc.name,
            type: lc.type as any,
            duration: lc.duration,
            sampleRate: lc.sampleRate,
            createdAt: lc.createdAt,
            vectors: lc.vectors,
            audioBuffer: buffer,
          });
        } catch (err) {
          console.error(`Error decoding lab clip ${lc.name}:`, err);
        }
      }

      // 5. Update useProjectStore
      useProjectStore.setState({
        clips: reconstructedClips,
        labClips: reconstructedLabClips,
        bpm: project.bpm,
        lanes: project.lanes,
        selectedClipId: null,
        isPlaying: false,
        currentStep: 0,
        transform: project.transform || null,
        boardPlaybackMode: project.boardPlaybackMode || 'both',
        synthType: project.synthType || 'triangle',
        synthSettings: project.synthSettings || { cutoff: 800, detune: 12, attack: 2.0, release: 4.0 },
      });

      // 6. Update useDrumsStore
      const ds = project.drumsState;
      if (ds) {
        useDrumsStore.setState({
          patterns: ds.patterns,
          synthParams: ds.synthParams,
          lfoParams: ds.lfoParams,
          modulations: ds.modulations,
          mixerParams: ds.mixerParams,
          bpm: ds.bpm || project.bpm,
          isPlaying: false,
          currentStep: 0,
        });
      }

      // 7. Update useModularStore
      const ms = project.modularState;
      if (ms) {
        useModularStore.setState({
          modules: ms.modules || [],
          cables: ms.cables || [],
        });
      }

      set({
        currentProjectId: projectId,
        currentProjectName: project.name,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      console.error('Error loading project:', error);
      alert('No se pudo cargar el proyecto correctamente.');
      throw error;
    }
  },

  createNewProject: () => {
    // 1. Reset Project Store to defaults
    useProjectStore.setState({
      clips: [],
      labClips: [],
      bpm: 120,
      lanes: 8,
      selectedClipId: null,
      isPlaying: false,
      currentStep: 0,
      transform: null,
      boardPlaybackMode: 'both',
      synthType: 'triangle',
      synthSettings: {
        cutoff: 800,
        detune: 12,
        attack: 2.0,
        release: 4.0,
      },
    });

    // 2. Reset Drums Store to basic beat
    const initialPatterns = {
      bd: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      sd: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      ch: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      oh: Array(16).fill(false),
      cp: Array(16).fill(false),
      cb: Array(16).fill(false),
    };
    
    useDrumsStore.setState({
      patterns: initialPatterns,
      synthParams: {
        bd: { pitch: 52, decay: 0.35, click: 0.7, drive: 0.2 },
        sd: { tone: 180, decay: 0.2, snappy: 0.5, cutoff: 1800 },
        ch: { decay: 0.08, tone: 8000 },
        oh: { decay: 0.35, tone: 8000 },
        cp: { decay: 0.25, filter: 1500, density: 4 },
        cb: { pitch: 68, decay: 0.25 },
      },
      lfoParams: {
        type: 0,
        complexity: 8,
        attenuation: 0.8,
      },
      modulations: {
        'bd_pitch': { source: 'none', depth: 0.5 },
        'sd_decay': { source: 'none', depth: 0.5 },
        'ch_decay': { source: 'none', depth: 0.5 },
        'oh_tone': { source: 'none', depth: 0.5 },
        'cp_filter': { source: 'none', depth: 0.5 },
        'cb_decay': { source: 'none', depth: 0.5 },
      },
      mixerParams: {
        vol_bd: -4, pan_bd: -0.1, mute_bd: 0,
        vol_sd: -6, pan_sd: 0.1, mute_sd: 0,
        vol_ch: -8, pan_ch: -0.3, mute_ch: 0,
        vol_oh: -8, pan_oh: 0.3, mute_oh: 0,
        vol_cp: -10, pan_cp: -0.2, mute_cp: 0,
        vol_cb: -12, pan_cb: 0.2, mute_cb: 0,
      },
      bpm: 120,
      isPlaying: false,
      currentStep: 0,
    });

    // 3. Reset Modular Store (default initial template modules)
    useModularStore.setState({
      modules: [
        {
          id: 'module-synth-1',
          type: 'synth',
          name: 'PolySynth Engine',
          x: 350,
          y: 100,
          params: { type: 0, basePitch: 60, volume: -10 },
          inputs: [
            { id: 'module-synth-1-input-pitch', moduleId: 'module-synth-1', label: 'Pitch CV', type: 'in', paramName: 'pitch' },
            { id: 'module-synth-1-input-gate', moduleId: 'module-synth-1', label: 'Gate (Trig)', type: 'in', paramName: 'gate' },
            { id: 'module-synth-1-input-cutoff', moduleId: 'module-synth-1', label: 'Filter CV', type: 'in', paramName: 'cutoff' },
          ],
          outputs: [{ id: 'module-synth-1-output-audio', moduleId: 'module-synth-1', label: 'Audio Out', type: 'out', paramName: 'audio' }],
        },
        {
          id: 'module-modulator-1',
          type: 'modulator',
          name: 'Fibonacci LFO',
          x: 50,
          y: 100,
          params: { type: 0, complexity: 5, attenuation: 0.8 },
          inputs: [],
          outputs: [{ id: 'module-modulator-1-output-val', moduleId: 'module-modulator-1', label: 'CV Out', type: 'out', paramName: 'value' }],
        },
        {
          id: 'module-scope-1',
          type: 'scope',
          name: 'Signal Scope',
          x: 650,
          y: 100,
          params: { speed: 1 },
          inputs: [
            { id: 'module-scope-1-input-audio', moduleId: 'module-scope-1', label: 'Audio In', type: 'in', paramName: 'audio' },
            { id: 'module-scope-1-input-cv', moduleId: 'module-scope-1', label: 'CV In', type: 'in', paramName: 'cv' },
          ],
          outputs: [],
        }
      ],
      cables: [],
    });

    set({
      currentProjectId: null,
      currentProjectName: null,
    });
  },

  deleteProject: async (projectId) => {
    try {
      await db.projects.delete(projectId);
      await db.clips.where({ projectId }).delete();
      await db.labClips.where({ projectId }).delete();
      
      if (get().currentProjectId === projectId) {
        get().createNewProject();
      } else {
        await get().loadSavedProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  },

  exportProjectToFile: async (projectId) => {
    set({ loading: true });
    try {
      const project = await db.projects.get(projectId);
      if (!project) throw new Error('Proyecto no encontrado');

      const clips = await db.clips.where({ projectId }).toArray();
      const labClips = await db.labClips.where({ projectId }).toArray();

      // Convert all audio blobs to Base64 strings for the single JSON file package
      const serializedClips = [];
      for (const c of clips) {
        const base64 = await blobToBase64(c.audioBlob);
        serializedClips.push({ ...c, audioBlobBase64: base64, audioBlob: undefined });
      }

      const serializedLabClips = [];
      for (const lc of labClips) {
        const base64 = await blobToBase64(lc.audioBlob);
        serializedLabClips.push({ ...lc, audioBlobBase64: base64, audioBlob: undefined });
      }

      const filePackage = {
        application: 'AudioGeometria',
        version: '1.0.0',
        project,
        clips: serializedClips,
        labClips: serializedLabClips,
      };

      const jsonStr = JSON.stringify(filePackage, null, 2);
      const fileBlob = new Blob([jsonStr], { type: 'application/json' });
      const fileUrl = URL.createObjectURL(fileBlob);
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.audiogeom`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);
      
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Error exporting project:', error);
      alert('Error al exportar el archivo del proyecto.');
    }
  },

  importProjectFromFile: async (file) => {
    set({ loading: true });
    try {
      const fileText = await file.text();
      const filePackage = JSON.parse(fileText);

      if (filePackage.application !== 'AudioGeometria') {
        throw new Error('Formato de archivo no válido para AudioGeometria');
      }

      const originalProject = filePackage.project;
      const originalClips = filePackage.clips || [];
      const originalLabClips = filePackage.labClips || [];

      // Generate a new UUID to prevent overwriting existing projects by accident
      const newProjectId = crypto.randomUUID();
      const newProjectName = `${originalProject.name} (Importado)`;
      const timestamp = Date.now();

      const newProject: ProjectData = {
        ...originalProject,
        id: newProjectId,
        name: newProjectName,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.projects.put(newProject);

      // Save clips
      for (const c of originalClips) {
        const blob = await base64ToBlob(c.audioBlobBase64);
        const newClip: ClipData = {
          id: c.id,
          projectId: newProjectId,
          name: c.name,
          lane: c.lane,
          startTime: c.startTime,
          duration: c.duration,
          modulators: c.modulators || [],
          vectors: c.vectors || [],
          audioBlob: blob,
        };
        await db.clips.put(newClip);
      }

      // Save lab clips
      for (const lc of originalLabClips) {
        const blob = await base64ToBlob(lc.audioBlobBase64);
        const newLabClip: LabClipData = {
          id: lc.id,
          projectId: newProjectId,
          name: lc.name,
          type: lc.type,
          duration: lc.duration,
          sampleRate: lc.sampleRate,
          createdAt: lc.createdAt,
          vectors: lc.vectors,
          audioBlob: blob,
        };
        await db.labClips.put(newLabClip);
      }

      set({ loading: false });
      await get().loadSavedProjects();
      await get().loadProject(newProjectId);
    } catch (error) {
      set({ loading: false });
      console.error('Error importing project:', error);
      alert('No se pudo importar el archivo del proyecto. Verifica que el archivo sea correcto.');
    }
  },
}));
