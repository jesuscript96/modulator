import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import AppShell from './components/layout/AppShell';
import LabPage from './pages/LabPage';
import BoardPage from './pages/BoardPage';
import LibraryPage from './pages/LibraryPage';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleTogglePlay = useCallback(async () => {
    await Tone.start();
    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const id = Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        setCurrentStep((s) => s + 1);
      }, time);
    }, '16n');
    return () => { Tone.Transport.clear(id); };
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
          <Route path="/board" element={<BoardPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
