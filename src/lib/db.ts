import Dexie, { type Table } from 'dexie';

export interface ProjectData {
  id: string; // UUID
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  lanes: number;
  boardPlaybackMode: 'both' | 'synth' | 'audio';
  synthType: 'triangle' | 'celestial' | 'violin' | 'guitar';
  synthSettings: {
    cutoff: number;
    detune: number;
    attack: number;
    release: number;
  };
  transform: any; // AffineMatrix JSON
  drumsState: any; // Serialized useDrumsStore values
  modularState: any; // Serialized useModularStore values
}

export interface ClipData {
  id: string; // unique clip id (e.g., board-xxx)
  projectId: string; // foreign key relation to projects
  name: string;
  lane: number;
  startTime: number;
  duration: number;
  modulators: any[];
  vectors: any[];
  audioBlob: Blob; // WAV encoded file stored locally
}

export interface LabClipData {
  id: string;
  projectId: string; // empty string or specific project id if tied to one
  name: string;
  type: string;
  duration: number;
  sampleRate: number;
  createdAt: number;
  vectors?: any[];
  audioBlob: Blob; // WAV encoded file stored locally
}

class AudioGeometriaDatabase extends Dexie {
  projects!: Table<ProjectData>;
  clips!: Table<ClipData>;
  labClips!: Table<LabClipData>;

  constructor() {
    super('AudioGeometriaDB');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      clips: 'id, projectId',
      labClips: 'id, projectId, createdAt',
    });
  }
}

export const db = new AudioGeometriaDatabase();

// Request persistent storage from browser so it doesn't clear our database automatically
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persistent) => {
    if (persistent) {
      console.log('AudioGeometria: Almacenamiento local persistente CONCEDIDO.');
    } else {
      console.warn('AudioGeometria: Almacenamiento local persistente DENEGADO. Tus datos podrían ser eliminados por el navegador si te queda muy poco espacio en disco.');
    }
  });

  // Log current storage estimate for information
  if (navigator.storage.estimate) {
    navigator.storage.estimate().then((estimate) => {
      const usageMB = estimate.usage ? (estimate.usage / (1024 * 1024)).toFixed(1) : '0';
      const quotaMB = estimate.quota ? (estimate.quota / (1024 * 1024)).toFixed(1) : '0';
      console.log(`AudioGeometria: Uso de almacenamiento local: ${usageMB} MB de un límite de ${quotaMB} MB.`);
    });
  }
}
