import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import AppShell from './components/layout/AppShell';
import LabPage from './pages/LabPage';
import BoardPage from './pages/BoardPage';
import LibraryPage from './pages/LibraryPage';
import ComposerPage from './pages/ComposerPage';
import { useProjectStore } from './stores/useProjectStore';
import { BoardAudioEngine } from './engine/BoardAudioEngine';

export default function App() {
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const currentStep = useProjectStore((s) => s.currentStep);
  const clips = useProjectStore((s) => s.clips);
  const bpm = useProjectStore((s) => s.bpm);
  const boardPlaybackMode = useProjectStore((s) => s.boardPlaybackMode);
  const synthType = useProjectStore((s) => s.synthType);
  const synthSettings = useProjectStore((s) => s.synthSettings);

  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setCurrentStep = useProjectStore((s) => s.setCurrentStep);

  const boardEngine = useMemo(() => new BoardAudioEngine(), []);

  // Sync board engine with clips, BPM, synth engine, and settings
  useEffect(() => {
    boardEngine.sync(clips, bpm, boardPlaybackMode, synthType);
    if (synthSettings) {
      if (synthType === 'celestial' && boardEngine.celestialSynth) {
        boardEngine.celestialSynth.setBrightness(synthSettings.cutoff);
        boardEngine.celestialSynth.setDetune(synthSettings.detune);
        boardEngine.celestialSynth.setAttack(synthSettings.attack);
        boardEngine.celestialSynth.setRelease(synthSettings.release);
      } else if (synthType === 'violin' && boardEngine.violinSynth) {
        boardEngine.violinSynth.setBrightness(synthSettings.cutoff);
        boardEngine.violinSynth.setDetune(synthSettings.detune);
        boardEngine.violinSynth.setAttack(synthSettings.attack);
        boardEngine.violinSynth.setRelease(synthSettings.release);
      } else if (synthType === 'guitar' && boardEngine.guitarSynth) {
        boardEngine.guitarSynth.setBrightness(synthSettings.cutoff);
        boardEngine.guitarSynth.setDetune(synthSettings.detune);
        boardEngine.guitarSynth.setAttack(synthSettings.attack);
        boardEngine.guitarSynth.setRelease(synthSettings.release);
      }
    }
  }, [clips, bpm, boardPlaybackMode, synthType, synthSettings, boardEngine]);

  useEffect(() => {
    return () => {
      boardEngine.dispose();
    };
  }, [boardEngine]);

  const handleTogglePlay = useCallback(async () => {
    await Tone.start();
    if (isPlaying) {
      Tone.Transport.stop();
      boardEngine.stopAllPlayers();
      setCurrentStep(0);
      setPlaying(false);
    } else {
      boardEngine.playActiveClips(Tone.Transport.seconds);
      Tone.Transport.start();
      setPlaying(true);
    }
  }, [isPlaying, setPlaying, setCurrentStep, boardEngine]);

  useEffect(() => {
    const id = Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        useProjectStore.setState((s) => ({ currentStep: s.currentStep + 1 }));
      }, time);
    }, '16n');
    return () => {
      Tone.Transport.clear(id);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppShell
              isPlaying={isPlaying}
              currentStep={currentStep}
              onTogglePlay={handleTogglePlay}
            />
          }
        >
          <Route index element={<Navigate to="/lab" replace />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/board" element={<BoardPage boardEngine={boardEngine} />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/composer" element={<ComposerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

