import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TransportBar from './TransportBar';
import { useProjectStore } from '../../stores/useProjectStore';

interface AppShellProps {
  isPlaying: boolean;
  currentStep: number;
  fractalDimension?: number;
  onTogglePlay: () => void;
}

export default function AppShell({
  isPlaying,
  currentStep,
  fractalDimension,
  onTogglePlay,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const bpm = useProjectStore((s) => s.bpm);
  const setBpm = useProjectStore((s) => s.setBpm);

  return (
    <div className="h-screen flex flex-col font-sans text-[#111] bg-[#f4f4f0]">
      {/* Main area: sidebar + content */}
      <div className="flex-grow flex min-h-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-grow flex flex-col min-w-0 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Transport bar (always visible) */}
      <TransportBar
        isPlaying={isPlaying}
        bpm={bpm}
        currentStep={currentStep}
        fractalDimension={fractalDimension}
        onTogglePlay={onTogglePlay}
        onBpmChange={setBpm}
      />
    </div>
  );
}
