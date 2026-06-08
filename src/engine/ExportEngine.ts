import type { Clip, SoundVector, ModulatorConfig, AffineMatrix } from '../types';

export interface MathScore {
  version: 1;
  bpm: number;
  createdAt: string;
  clips: Array<{
    id: string;
    name: string;
    lane: number;
    startTime: number;
    duration: number;
    vectors: SoundVector[];
    modulators: ModulatorConfig[];
  }>;
}

export function exportMathScore(clips: Clip[], bpm: number): string {
  const score: MathScore = {
    version: 1,
    bpm,
    createdAt: new Date().toISOString(),
    clips: clips.map((c) => ({
      id: c.id,
      name: c.name,
      lane: c.lane,
      startTime: c.startTime,
      duration: c.duration,
      vectors: c.vectors,
      modulators: c.modulators,
    })),
  };
  return JSON.stringify(score, null, 2);
}

export async function renderToWav(
  clips: Clip[],
  bpm: number,
  durationSeconds: number
): Promise<Blob> {
  const sampleRate = 44100;
  const totalSamples = Math.ceil(durationSeconds * sampleRate);
  const offCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  const beatsPerSecond = bpm / 60;

  for (const clip of clips) {
    if (!clip.audioBuffer) continue;

    const startSeconds = clip.startTime / beatsPerSecond;
    if (startSeconds >= durationSeconds) continue;

    const source = offCtx.createBufferSource();
    const newBuffer = offCtx.createBuffer(
      clip.audioBuffer.numberOfChannels,
      clip.audioBuffer.length,
      clip.audioBuffer.sampleRate
    );
    for (let ch = 0; ch < clip.audioBuffer.numberOfChannels; ch++) {
      newBuffer.getChannelData(ch).set(clip.audioBuffer.getChannelData(ch));
    }
    source.buffer = newBuffer;
    source.connect(offCtx.destination);
    source.start(startSeconds);
  }

  const renderedBuffer = await offCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = buffer.length;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
