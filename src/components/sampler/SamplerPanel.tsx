import React, { useState, useCallback } from 'react';
import { Upload, Plus, Scissors } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import WaveformDisplay from './WaveformDisplay';
import FragmentCutter from './FragmentCutter';
import HelpTooltip from '../shared/HelpTooltip';
import helpContent from '../../data/helpContent';
import type { Clip } from '../../types';

interface ImportedFile {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  waveformData: number[];
}

function extractWaveform(buffer: AudioBuffer, samples = 300): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const data: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }
    data.push(sum / blockSize);
  }
  return data;
}

let clipIdCounter = 0;

export default function SamplerPanel() {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showCutter, setShowCutter] = useState(false);
  const addClip = useProjectStore((s) => s.addClip);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/')
    );

    for (const file of droppedFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const waveformData = extractWaveform(audioBuffer);
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      setFiles((prev) => [...prev, { id, name: file.name, audioBuffer, waveformData }]);
      setActiveFileId(id);
    }
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleAddToBoard = useCallback(
    (file: ImportedFile) => {
      const clip: Clip = {
        id: `clip-${++clipIdCounter}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        audioBuffer: file.audioBuffer,
        vectors: [],
        lane: 0,
        startTime: 0,
        duration: file.audioBuffer.duration / (60 / 120) ,
        modulators: [],
      };
      addClip(clip);
    },
    [addClip]
  );

  const handleCut = useCallback(
    (startSample: number, endSample: number, name: string) => {
      if (!activeFile) return;
      const ctx = new AudioContext();
      const length = endSample - startSample;
      const newBuffer = ctx.createBuffer(
        activeFile.audioBuffer.numberOfChannels,
        length,
        activeFile.audioBuffer.sampleRate
      );
      for (let ch = 0; ch < activeFile.audioBuffer.numberOfChannels; ch++) {
        const src = activeFile.audioBuffer.getChannelData(ch);
        const dst = newBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dst[i] = src[startSample + i];
        }
      }

      const clip: Clip = {
        id: `clip-${++clipIdCounter}`,
        name,
        audioBuffer: newBuffer,
        vectors: [],
        lane: 0,
        startTime: 0,
        duration: newBuffer.duration / (60 / 120),
        modulators: [],
      };
      addClip(clip);
      setShowCutter(false);
    },
    [activeFile, addClip]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        className="border border-dashed border-black/40 p-4 h-32 flex items-center justify-center relative hover:border-black transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="absolute top-2 right-2">
          <HelpTooltip {...helpContent.sampler} />
        </span>
        <div className="text-center text-xs uppercase tracking-widest text-black/40">
          <Upload className="mx-auto mb-2 w-5 h-5" />
          Drop audio files here
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="font-bold text-[10px] uppercase tracking-widest mb-1">
            Imported ({files.length})
          </h4>
          {files.map((f) => (
            <div
              key={f.id}
              className={`border px-2 py-1.5 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                f.id === activeFileId
                  ? 'border-black bg-black/5'
                  : 'border-black/20 hover:border-black/40'
              }`}
              onClick={() => setActiveFileId(f.id)}
            >
              <span className="flex-grow font-mono truncate">{f.name}</span>
              <span className="text-[9px] text-black/40 font-mono">
                {f.audioBuffer.duration.toFixed(1)}s
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToBoard(f);
                }}
                className="text-black/30 hover:text-black"
                title="Add to board"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFileId(f.id);
                  setShowCutter(true);
                }}
                className="text-black/30 hover:text-black"
                title="Cut fragment"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Waveform preview */}
      {activeFile && !showCutter && (
        <div className="border border-black/20 p-2">
          <WaveformDisplay
            data={activeFile.waveformData}
            currentStep={0}
            totalSteps={16}
            height={64}
          />
        </div>
      )}

      {/* Fragment cutter */}
      {activeFile && showCutter && (
        <FragmentCutter
          waveformData={activeFile.waveformData}
          audioBuffer={activeFile.audioBuffer}
          onCut={handleCut}
        />
      )}
    </div>
  );
}
