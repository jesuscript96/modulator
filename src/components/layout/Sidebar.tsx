import { NavLink } from 'react-router-dom';
import { FlaskConical, LayoutGrid, Library, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/lab', icon: FlaskConical, label: 'Lab' },
  { to: '/board', icon: LayoutGrid, label: 'Board' },
  { to: '/library', icon: Library, label: 'Library' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const clips = useProjectStore((s) => s.clips);
  const labClips = useProjectStore((s) => s.labClips);
  const sendToBoard = useProjectStore((s) => s.sendToBoard);

  const hasAny = clips.length > 0 || labClips.length > 0;

  return (
    <aside
      className={`border-r border-black bg-[#f4f4f0] flex flex-col transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-48'
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="p-3 border-b border-black/20 flex items-center justify-center hover:bg-black/5 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-1.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 text-xs uppercase tracking-widest transition-colors ${
                isActive
                  ? 'bg-black text-[#f4f4f0] font-bold'
                  : 'text-black/50 hover:text-black hover:bg-black/5'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Lab clips (staging) */}
      {!collapsed && labClips.length > 0 && (
        <div className="overflow-y-auto border-t border-black/20 mt-2 pt-2 px-2">
          <h4 className="text-[9px] uppercase tracking-widest text-black/40 mb-1.5 px-1">
            Lab ({labClips.length})
          </h4>
          <div className="flex flex-col gap-0.5">
            {labClips.map((clip) => (
              <div
                key={clip.id}
                className="text-[10px] font-mono px-1.5 py-1 border border-dashed border-black/20 truncate hover:border-black/40 cursor-pointer transition-colors flex items-center gap-1 group"
                title={`${clip.name} — click to send to board`}
                onClick={() => sendToBoard(clip.id)}
              >
                <span className="truncate flex-1">{clip.name}</span>
                <span className="text-[8px] text-black/30 group-hover:text-black shrink-0">+</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board clips */}
      {!collapsed && clips.length > 0 && (
        <div className="overflow-y-auto border-t border-black/20 mt-2 pt-2 px-2">
          <h4 className="text-[9px] uppercase tracking-widest text-black/40 mb-1.5 px-1">
            Board ({clips.length})
          </h4>
          <div className="flex flex-col gap-0.5">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="text-[10px] font-mono px-1.5 py-1 border border-black/10 truncate hover:border-black/30 cursor-pointer transition-colors"
                title={clip.name}
              >
                {clip.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className={`border-t border-black/20 p-2 text-[9px] font-mono text-black/30 text-center ${hasAny ? 'mt-auto' : 'mt-auto'}`}>
          Audio Geometria
        </div>
      )}
    </aside>
  );
}
