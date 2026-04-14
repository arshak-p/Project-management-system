import { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Database, Loader2, Globe, Layers, ChevronRight } from 'lucide-react';

export default function ProjectsPage({ onNavigate }: { onNavigate?: (page: any) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = () => api.getProjects({ archived: showArchived }).then(r => setProjects(r.data)).finally(() => setIsLoading(false));
  useEffect(() => { load(); }, [showArchived]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.createProject(form);
      setShowForm(false);
      setForm({ name: '', slug: '', description: '' });
      load();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
       setError(JSON.stringify(err.response?.data || 'Failed to initialize project orbit.'));
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: number, name: string) => {
    if (!confirm(`Archive project orbital "${name}" to historical storage?`)) return;
    try {
      await api.deleteProject(id);
      load();
    } catch (err: any) {
      alert('Archive operation failed. Security level insufficient.');
    }
  };

  const handleRestore = async (id: number, name: string) => {
    if (!confirm(`Restore project orbit "${name}" to active status?`)) return;
    try {
      await api.updateProject(id, { is_active: true });
      load();
    } catch (err: any) {
      alert('Restore failed.');
    }
  };

  const handleProjectClick = (projectId: number) => {
    localStorage.setItem('jump_project_filter', projectId.toString());
    if (onNavigate) {
      onNavigate('tasks');
    }
  };

  if (isLoading) return (
     <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
     </div>
  );

  return (
    <div className="space-y-10 pb-20 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Projects</h1>
          <p className="text-text-muted mt-2 font-medium">Manage and monitor all active client projects.</p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-3 glass px-5 py-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
            <Database className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-text-muted'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">Show Archived</span>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
            <div className={`w-10 h-5 rounded-full relative transition-colors ${showArchived ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showArchived ? 'left-6' : 'left-1'}`}></div>
            </div>
          </label>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-3 px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bento-card p-8 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
             <Layers className="w-5 h-5 text-primary" />
             <h3 className="font-extrabold text-lg uppercase tracking-tight">New Project Details</h3>
          </div>
          {error && <p className="text-error text-xs font-bold mb-6 p-4 bg-error/10 border border-error/20 rounded-xl">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-text-muted/60 tracking-widest px-2">Project Name</label>
               <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} placeholder="Project name..." required className="w-full px-5 py-3.5 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-text-muted/60 tracking-widest px-2">Slug</label>
               <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="Project slug..." required className="w-full px-5 py-3.5 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none font-mono transition-all" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-text-muted/60 tracking-widest px-2">Description</label>
               <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mission objective..." className="w-full px-5 py-3.5 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
            </div>
            <div className="md:col-span-3 flex gap-4 justify-end pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-xs font-bold text-text-muted hover:text-text italic transition-all">Abort Mission</button>
              <button type="submit" disabled={saving} className="flex items-center gap-3 px-8 py-3.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bento-card p-20 text-center border-dashed border-border/60">
          <Globe className="w-16 h-16 text-text-muted/20 mx-auto mb-6" />
          <h3 className="text-xl font-extrabold mb-2 italic">No Projects</h3>
          <p className="text-text-muted text-sm font-medium">No active projects found in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((p) => (
            <div 
              key={p.id} 
              onClick={() => handleProjectClick(p.id)}
              className={`bento-card group overflow-hidden hover:border-indigo-500 transition-all cursor-pointer ${!p.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-indigo-500/5 text-indigo-500 flex items-center justify-center font-black text-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    {p.is_active ? (
                      <button onClick={(e) => { e.stopPropagation(); handleArchive(p.id, p.name); }} title="Archive Project" className="p-3 bg-amber-500/5 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all"><Database className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleRestore(p.id, p.name); }} title="Restore Project" className="p-3 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                   <h3 className="font-extrabold text-xl text-text tracking-tight group-hover:text-indigo-500 transition-colors">{p.name}</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/60 mt-1 block px-1">{p.slug}</span>
                </div>
                <p className="text-sm font-medium text-text-muted line-clamp-2 leading-relaxed h-10 mb-6">{p.description || 'Sector clearance: No briefing available.'}</p>
                <div className="flex gap-4 mb-8">
                   <div className="glass px-3 py-1.5 rounded-xl border border-border/50 flex flex-col">
                      <span className="text-[8px] font-black uppercase text-text-muted opacity-60">Total Effort</span>
                      <span className="text-xs font-bold text-primary">{Math.floor((p.total_minutes || 0) / 60)}h {(p.total_minutes || 0) % 60}m</span>
                   </div>
                </div>
                
                <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                   <div className="flex items-center gap-2 group/status">
                      <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${p.is_active ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                        {p.is_active ? 'Active Orbit' : 'Archived Log'}
                      </span>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleProjectClick(p.id); }}
                     className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-indigo-500 transition-all"
                   >
                      Mission Logs <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
