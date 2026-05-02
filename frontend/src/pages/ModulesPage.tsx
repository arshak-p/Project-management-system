import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, Layers, CheckCircle2, X } from 'lucide-react';
import { api } from '../api';
import type { WorkModule, User } from '../api';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ModulesPage({ me: _me }: { me: User | null }) {
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getModules({ archived: showArchived });
      setModules(r.data);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load, showArchived]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const safeSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await api.createModule({ name: newName, slug: safeSlug });
      setNewName('');
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { name?: string[] } } })?.response?.data?.name?.[0] || 'Failed to create module';
      setError(errorMsg);
    } finally { setSaving(false); }
  };

    } catch { alert('Failed to delete.'); }
  };
  
  const handleRestore = async (id: number) => {
    try {
      await api.restoreModule(id);
      load();
    } catch { alert('Failed to restore.'); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Task Modules</h1>
          <p className="text-text-muted mt-2 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Categorize your project workflow</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 glass px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest">Archives</span>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showArchived ? 'left-4.5' : 'left-0.5'}`}></div>
            </div>
          </label>
          <button 
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> New Module
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(mod => (
          <div key={mod.id} className="glass p-6 rounded-[2rem] border-white/5 group hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <Layers className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex gap-2">
                {mod.is_active ? (
                  <button 
                    onClick={() => handleDelete(mod.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-error hover:bg-error/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleRestore(mod.id)}
                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold">{mod.name}</h3>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-black opacity-40">Workflow Category</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500/60">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               Operational
            </div>
          </div>
        ))}

        {modules.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-white/10">
            <Layers className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
            <p className="text-text-muted font-bold">No modules defined yet.</p>
            <p className="text-xs text-text-muted mt-2">Add categories like "Design", "Development", or "Content".</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full lg:max-w-md h-full lg:h-auto lg:rounded-[2.5rem] border-primary/30 p-6 lg:p-8 shadow-2xl animate-in zoom-in-95 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black italic">Create Module</h3>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-black opacity-50">Define a new task category</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              {error && <div className="p-4 bg-error/10 border border-error/20 rounded-2xl text-xs text-error font-bold italic">{error}</div>}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted">Module Name</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Graphic Design"
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:border-primary outline-none transition-all placeholder:text-text-muted/40"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-xs font-black uppercase text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={saving}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
