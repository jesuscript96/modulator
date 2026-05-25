import type { SoundVector } from '../../types';

/**
 * Converts dominant frequencies and spectral frames into a series of note events (SoundVector[]).
 * Groups adjacent frames of identical pitch to form discrete notes, filtering out noise.
 */
export function extractMelodyVectors(
  melodyFreqs: number[],
  harmonicFrames: Float32Array[],
  sampleRate = 44100,
  hopSize = 512,
  frameSize = 2048,
  sourceId = 'hps-extracted'
): SoundVector[] {
  const frameDurationMs = (hopSize / sampleRate) * 1000;
  const vectors: SoundVector[] = [];

  let currentNote: {
    pitch: number;
    startFrame: number;
    frameValues: number[];
    magnitudes: number[];
  } | null = null;

  // Amplitude threshold below which we consider a frame silent
  const SILENCE_THRESHOLD = 0.005;

  for (let i = 0; i < melodyFreqs.length; i++) {
    const freq = melodyFreqs[i];
    const frame = harmonicFrames[i];

    // Find the magnitude of this dominant frequency
    let maxIdx = 0;
    let maxVal = 0;
    for (let k = 1; k < frame.length; k++) {
      if (frame[k] > maxVal) {
        maxVal = frame[k];
        maxIdx = k;
      }
    }

    let pitch = -1;
    // Map frequency to MIDI pitch if it is within a reasonable range and not silent
    if (freq > 30 && freq < 8000 && maxVal > SILENCE_THRESHOLD) {
      pitch = Math.round(12 * Math.log2(freq / 440) + 69);
    }

    if (currentNote) {
      if (pitch === currentNote.pitch) {
        // Continue current note
        currentNote.frameValues.push(freq);
        currentNote.magnitudes.push(maxVal);
      } else {
        // End current note, process it
        finalizeNote(currentNote, i);
        // Start a new note if not silent
        if (pitch !== -1 && pitch >= 12 && pitch <= 127) {
          currentNote = {
            pitch,
            startFrame: i,
            frameValues: [freq],
            magnitudes: [maxVal],
          };
        } else {
          currentNote = null;
        }
      }
    } else {
      // Start a new note if not silent
      if (pitch !== -1 && pitch >= 12 && pitch <= 127) {
        currentNote = {
          pitch,
          startFrame: i,
          frameValues: [freq],
          magnitudes: [maxVal],
        };
      }
    }
  }

  // Finalize last note if any
  if (currentNote) {
    finalizeNote(currentNote, melodyFreqs.length);
  }

  function finalizeNote(
    note: {
      pitch: number;
      startFrame: number;
      frameValues: number[];
      magnitudes: number[];
    },
    endFrame: number
  ) {
    const durationMs = (endFrame - note.startFrame) * frameDurationMs;

    // Filter out notes that are too short (noise/glitches)
    if (durationMs < 60) return;

    const startMs = note.startFrame * frameDurationMs;

    // Average magnitude of the note
    const avgMag = note.magnitudes.reduce((a, b) => a + b, 0) / note.magnitudes.length;
    // Map average magnitude to velocity range [0.4, 1.0]
    const velocity = Math.min(1.0, Math.max(0.4, 0.4 + avgMag * 8));

    vectors.push({
      id: `note-${note.startFrame}-${Math.random().toString(36).slice(2, 6)}`,
      t: startMs,
      p: note.pitch,
      duration: durationMs,
      velocity,
      sourceId,
    });
  }

  return vectors;
}
