import React, { useEffect, useState, useRef } from 'react';
import { Save, Plus, FolderOpen, Download, Trash2, Upload, Loader2, X, AlertTriangle } from 'lucide-react';
import { useSyncStore } from '../../stores/useSyncStore';

interface ProjectManagerProps {
  onClose: () => void;
}

export default function ProjectManager({ onClose }: ProjectManagerProps) {
  const {
    savedProjects,
    loading,
    currentProjectId,
    currentProjectName,
    loadSavedProjects,
    saveProject,
    loadProject,
    createNewProject,
    deleteProject,
    exportProjectToFile,
    importProjectFromFile,
  } = useSyncStore();

  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects list on mount
  useEffect(() => {
    loadSavedProjects();
  }, [loadSavedProjects]);

  // Set initial project name input
  useEffect(() => {
    if (currentProjectName) {
      setProjectName(currentProjectName);
    } else {
      setProjectName('');
    }
  }, [currentProjectName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    try {
      await saveProject(projectName.trim());
      alert('Proyecto guardado en tu navegador exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el proyecto.');
    }
  };

  const handleLoad = async (id: string) => {
    if (confirm('¿Deseas cargar este proyecto? Se perderá cualquier cambio no guardado en el proyecto actual.')) {
      try {
        await loadProject(id);
        onClose();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas borrar permanentemente el proyecto "${name}"?`)) {
      await deleteProject(id);
    }
  };

  const handleCreateNew = () => {
    if (confirm('¿Deseas empezar un nuevo proyecto en blanco? Se limpiarán todos los racks.')) {
      createNewProject();
      setProjectName('');
      onClose();
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await importProjectFromFile(file);
      alert('Proyecto importado y cargado con éxito.');
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Main Panel */}
      <div className="w-full max-w-2xl bg-[#f4f4f0] border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh] relative">
        
        {/* Header */}
        <div className="border-b-2 border-black p-4 flex justify-between items-center bg-white">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            📂 GESTOR DE PROYECTOS LOCALES
          </h2>
          <button 
            onClick={onClose}
            className="border border-black p-1 hover:bg-black hover:text-[#f4f4f0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-black mb-4" />
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2">Decodificando audios y cargando racks</h3>
            <p className="text-xs text-black/60 max-w-sm">
              Estamos procesando tus archivos de audio y cargando las conexiones del sintetizador modular. Esto tomará solo unos segundos.
            </p>
          </div>
        )}

        {/* Content Container (Scrollable) */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Top Row: Current Project Save / New */}
          <div className="border border-black p-4 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <form onSubmit={handleSave} className="flex-grow w-full">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-black/50 mb-1">
                Proyecto Actual: {currentProjectId ? '💾 Guardado en Local' : '📝 Sin Guardar'}
              </label>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  placeholder="Nombre de tu proyecto..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="flex-grow border border-black px-3 py-2 text-xs font-mono bg-white outline-none focus:bg-yellow-50/20"
                  required
                />
                <button
                  type="submit"
                  className="bg-emerald-500 text-white border border-black px-4 py-2 text-xs font-mono uppercase font-bold tracking-wider hover:bg-emerald-600 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1 shrink-0"
                >
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>

            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleCreateNew}
                className="bg-cyan-400 text-black border border-black px-4 py-2 text-xs font-mono uppercase font-bold tracking-wider hover:bg-cyan-500 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Nuevo
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="bg-indigo-500 text-white border border-black px-4 py-2 text-xs font-mono uppercase font-bold tracking-wider hover:bg-indigo-600 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-1"
              >
                <Upload className="w-4 h-4" /> Importar
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".audiogeom"
                className="hidden"
              />
            </div>
          </div>

          {/* Warning banner about browser clearing data */}
          <div className="border border-amber-400 bg-amber-50 p-3 flex gap-3 text-amber-800 text-[11px] leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold uppercase tracking-wider text-amber-900 mb-0.5">Almacenamiento Local Seguro</p>
              <p>
                Los proyectos se guardan en la base de datos interna de tu navegador (IndexedDB) con persistencia autorizada.
                Para evitar pérdidas en caso de que borres el caché del navegador, te recomendamos descargar una copia de seguridad física usando el botón <strong>Exportar (Descargar)</strong>.
              </p>
            </div>
          </div>

          {/* Saved Projects Section */}
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest text-black/60 mb-3">
              📋 PROYECTOS GUARDADOS ({savedProjects.length})
            </h3>
            
            {savedProjects.length === 0 ? (
              <div className="border border-dashed border-black/30 p-8 text-center text-xs text-black/40 font-mono">
                No hay proyectos guardados en este ordenador. ¡Crea y guarda uno arriba!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {savedProjects.map((p) => {
                  const isCurrent = p.id === currentProjectId;
                  const dateStr = new Date(p.updatedAt).toLocaleString();
                  return (
                    <div
                      key={p.id}
                      className={`border-2 p-3 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
                        isCurrent 
                          ? 'border-emerald-500 bg-emerald-50/10' 
                          : 'border-black'
                      }`}
                    >
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase truncate block">{p.name}</span>
                          {isCurrent && (
                            <span className="bg-emerald-500 text-white border border-black text-[8px] font-mono px-1 py-0.2">
                              ACTIVO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-black/50 font-mono mt-1">
                          Modificado: {dateStr} | BPM: {p.bpm} | Pistas: {p.lanes}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button
                          onClick={() => handleLoad(p.id)}
                          className="border border-black bg-white hover:bg-neutral-100 p-1.5 text-black hover:text-emerald-600 transition-colors flex items-center justify-center"
                          title="Cargar Proyecto"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportProjectToFile(p.id)}
                          className="border border-black bg-white hover:bg-neutral-100 p-1.5 text-black hover:text-indigo-600 transition-colors flex items-center justify-center"
                          title="Exportar archivo (.audiogeom)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="border border-black bg-white hover:bg-neutral-100 p-1.5 text-black hover:text-red-500 transition-colors flex items-center justify-center"
                          title="Borrar Proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-3 bg-neutral-100 text-right text-[9px] font-mono text-black/40">
          Audio Geometria Local Storage Engine v1.0.0
        </div>

      </div>
    </div>
  );
}
