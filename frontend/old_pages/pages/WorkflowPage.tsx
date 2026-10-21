import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, Workflow, CheckCircle2, X, Edit2, LayoutGrid, Database } from 'lucide-react';
import { api } from '../api';
import type { TaskState, User } from '../api';

export default function WorkflowPage({ me: _me }: { me: User | null }) {
  const [states, setStates] = useState<TaskState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: '#3b82f6', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getStates({ archived: showArchived });
      setStates(r.data);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  }, [showArchived]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const safeSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = { ...form, slug: safeSlug };
      
      if (editingId) {
        await api.updateState(editingId, payload);
      } else {
        await api.createState(payload);
      }
      setForm({ name: '', slug: '', description: '', color: '#3b82f6', is_active: true });
      setEditingId(null);
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to save workflow state';
      setError(errorMsg);
    } finally { setSaving(false); }
  };

  const startEdit = (s: TaskState) => {
    setForm({ 
      name: s.name, 
      slug: s.slug, 
      description: s.description || '', 
      color: s.color || '#3b82f6',
      is_active: s.is_active
    });
    setEditingId(s.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Archive this workflow state? Tasks in this state might become inaccessible on the board.')) return;
    try {
      await api.deleteState(id);
      load();
    } catch { alert('Failed to archive state.'); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter">Workflow Pipeline</h1>
          <p className="text-text-muted mt-2 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Manage your task lifecycle states</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 glass px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
            <Database className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-text-muted'}`} />
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
            <Plus className="w-4 h-4" /> New State
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {states.map(state => (
          <div key={state.id} className="glass p-6 rounded-[2rem] border-white/5 group hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${state.color}20` }}>
                <LayoutGrid className="w-5 h-5" style={{ color: state.color }} />
              </div>
              <div className="flex gap-2">
                {state.is_active && (
                   <button 
                     onClick={() => startEdit(state)}
                     className="opacity-0 group-hover:opacity-100 p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                )}
                {state.is_active && (
                  <button 
                    onClick={() => handleDelete(state.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-error hover:bg-error/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold flex items-center gap-2">
               {state.name}
               <span className="text-[9px] font-mono opacity-40">#{state.slug}</span>
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed opacity-60 line-clamp-2">{state.description || 'No description provided for this stage.'}</p>
            
            <div className="mt-6 flex items-center justify-between">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state.color }}></div>
                  Pipeline Step
               </div>
               <span className="text-[10px] font-mono opacity-30">{state.color}</span>
            </div>
          </div>
        ))}

        {states.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-white/10">
            <Workflow className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
            <p className="text-text-muted font-bold">No workflow states defined.</p>
            <p className="text-xs text-text-muted mt-2">Create states like "To Do", "In Progress", or "Review".</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full lg:max-w-md h-full lg:h-auto lg:rounded-[2.5rem] border-primary/30 p-6 lg:p-8 shadow-2xl animate-in zoom-in-95 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black italic">{editingId ? 'Edit State' : 'Create State'}</h3>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-black opacity-50">{editingId ? 'Modify pipeline stage' : 'Add new pipeline stage'}</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingId(null); setForm({ name: '', slug: '', description: '', color: '#3b82f6', is_active: true }); }} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {error && <div className="p-4 bg-error/10 border border-error/20 rounded-2xl text-xs text-error font-bold italic">{error}</div>}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted">Display Name</label>
                <input 
                  autoFocus
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. In Creative Review"
                  className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted">Unique Slug (Optional)</label>
                <input 
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. creative-review"
                  className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-mono focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted">Description</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What happens in this stage?"
                  rows={2}
                  className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:border-primary outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted">Theme Color</label>
                <div className="flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                  <input 
                    type="color" 
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold opacity-60 uppercase">{form.color}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({ name: '', slug: '', description: '', color: '#3b82f6', is_active: true }); }}
                  className="flex-1 py-4 text-xs font-black uppercase text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={saving}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingId ? 'Update State' : 'Register State'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
