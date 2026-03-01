import { useProjectStore } from '../stores/useProjectStore';
import HelpTooltip from '../components/shared/HelpTooltip';

export default function LibraryPage() {
  const clips = useProjectStore((s) => s.clips);
  const removeClip = useProjectStore((s) => s.removeClip);

  return (
    <div className="p-4 md:p-8 flex flex-col flex-grow">
      <div className="flex items-center gap-3 border-b border-black pb-4 mb-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Library</h2>
        <HelpTooltip
          title="Fragment Library"
          technical="Colección de clips de audio importados y cortados. Cada clip contiene su AudioBuffer, vectores SoundVector y configuración de moduladores."
          beginner="Todos los trozos de audio que has importado o cortado aparecen aquí. Puedes verlos, organizarlos o eliminarlos."
        />
        <span className="text-xs font-mono text-black/40 ml-auto">
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
        </span>
      </div>

      {clips.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center text-black/30">
            <p className="text-sm uppercase tracking-widest mb-2">No clips yet</p>
            <p className="text-xs">Import audio in the Lab or drop files on the Board</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="border border-black/20 p-3 flex flex-col gap-2 hover:border-black/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold truncate">{clip.name}</span>
                <button
                  onClick={() => removeClip(clip.id)}
                  className="text-[9px] uppercase tracking-widest text-black/30 hover:text-black border border-black/10 px-1.5 py-0.5"
                >
                  ×
                </button>
              </div>
              <div className="text-[10px] font-mono text-black/40 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span>{clip.duration.toFixed(1)} beats</span>
                </div>
                <div className="flex justify-between">
                  <span>Lane</span>
                  <span>{clip.lane}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vectors</span>
                  <span>{clip.vectors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modulators</span>
                  <span>{clip.modulators.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
