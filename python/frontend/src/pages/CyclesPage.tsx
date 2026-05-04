import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Cycle, Project, User } from '../api';
import { Loader2, CalendarRange, Plus, ExternalLink, CalendarDays, Edit2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CyclesPage({ me: _me }: { me: User | null }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', project: '', start_date: '', end_date: '', is_recurring: false });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([api.getCycles({ archived: showArchived }), api.getProjects()])
      .then(([c, p]) => {
        setCycles(c.data);
        setProjects(p.data);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [showArchived]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCycle(editingId, form);
      } else {
        await api.createCycle(form);
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', project: '', start_date: '', end_date: '', is_recurring: false });
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to save cycle.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Cycle) => {
    setForm({
      name: c.name,
      project: c.project.toString(),
      start_date: c.start_date,
      end_date: c.end_date,
      is_recurring: c.is_recurring
    });
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleArchive = async (id: number) => {
    if (!confirm('Archive this cycle?')) return;
    try {
      await api.deleteCycle(id);
      load();
    } catch { alert('Archive failed.'); }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.restoreCycle(id);
      load();
    } catch { alert('Restore failed.'); }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-2xl border border-primary/30 shadow-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" /> {editingId ? 'Edit Sprint / Cycle' : 'New Sprint / Cycle'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Cycle Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Q4 Marketing Campaign" required className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase">Client Project</label>
                <select value={form.project} onChange={e => setForm({...form, project: e.target.value})} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:border-primary">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:border-primary" style={{colorScheme: 'dark'}} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:border-primary" style={{colorScheme: 'dark'}} />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="rounded text-primary focus:ring-primary w-4 h-4 bg-surface border-border" />
                <span className="text-sm font-medium">Monthly Recurring Retainer</span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setForm({ name: '', project: '', start_date: '', end_date: '', is_recurring: false }); }} className="flex-1 py-2 rounded-xl border border-border hover:bg-surface text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:opacity-90 disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-primary" /> Sprint / Cycle Planning
          </h1>
          <p className="text-text-muted mt-1">Manage project sprints, campaign timelines, and monthly retainers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 glass px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest">Archives</span>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showArchived ? 'left-4.5' : 'left-0.5'}`}></div>
            </div>
          </label>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl font-medium shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)] hover:opacity-90">
            <Plus className="w-4 h-4" /> Plan Cycle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cycles.length === 0 && (
          <div className="col-span-full glass rounded-2xl border border-border p-16 text-center">
            <CalendarDays className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Cycles Planned</h3>
            <p className="text-text-muted text-sm">Start organizing your tasks into timeboxes.</p>
          </div>
        )}
        
        {cycles.map(cycle => (
          <div key={cycle.id} className="glass rounded-2xl border border-border/80 p-5 hover:border-primary/40 transition-colors group">
             <div className="flex justify-between items-start mb-3">
                <span className="text-xs px-2.5 py-1 bg-surface border border-border rounded-lg text-text-muted font-medium flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {projects.find(p => p.id === cycle.project)?.name || 'Unknown Project'}
                </span>
                {cycle.is_recurring && (
                  <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg font-bold">
                    Recurring
                  </span>
                )}
                <div className="flex gap-2">
                   {cycle.is_active && (
                      <button onClick={() => startEdit(cycle)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                         <Edit2 className="w-4 h-4" />
                      </button>
                   )}
                   {cycle.is_active ? (
                     <button onClick={() => handleArchive(cycle.id)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <CalendarRange className="w-4 h-4" />
                     </button>
                   ) : (
                     <button onClick={() => handleRestore(cycle.id)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all">
                        <Plus className="w-4 h-4" />
                     </button>
                   )}
                </div>
             </div>
             <h3 className="font-bold text-lg leading-tight mb-2">{cycle.name}</h3>
             
             <div className="mt-4 p-3 bg-surface/50 border border-border rounded-xl flex items-center justify-between text-sm">
                <div>
                   <p className="text-xs font-semibold text-text-muted uppercase">Start</p>
                   <p className="font-medium mt-0.5">{cycle.start_date}</p>
                </div>
                <div className="text-text-muted">→</div>
                <div className="text-right">
                   <p className="text-xs font-semibold text-text-muted uppercase">End</p>
                   <p className="font-medium mt-0.5">{cycle.end_date}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

    </div>
  );
}
