import { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, ExternalLink, Loader2, FolderOpen } from 'lucide-react';

export default function ProjectsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getProjects().then(r => setProjects(r.data)).finally(() => setIsLoading(false));
  useEffect(() => { load(); }, []);

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
      setError(JSON.stringify(err.response?.data || 'Failed to create project'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      load();
    } catch (err: any) {
      alert('Failed to delete project. You might not have the correct permissions.');
    }
  };

  const colors = ['from-primary to-[#8b5cf6]', 'from-orange-400 to-pink-500', 'from-green-400 to-teal-500', 'from-yellow-400 to-orange-500'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Client Projects</h1>
          <p className="text-text-muted mt-1">Manage all client engagements and campaigns.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl font-medium shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)] hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass rounded-2xl border border-primary/30 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="font-bold text-lg mb-4">Create New Project</h3>
          {error && <p className="text-error text-sm mb-4 p-3 bg-error/10 rounded-lg border border-error/20">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} placeholder="Project name (e.g. Nike Campaign)" required className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="slug (e.g. nike-campaign)" required className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none font-mono" />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
            <div className="md:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-16 text-center">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No projects yet</h3>
          <p className="text-text-muted">Create your first client project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p, i) => (
            <div key={p.id} className="glass rounded-2xl border border-border/50 hover:border-primary/30 transition-all group overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${colors[i % colors.length]}`}></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-lg`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-primary"><ExternalLink className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="p-2 hover:bg-error/10 rounded-lg transition-colors text-text-muted hover:text-error"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-text mb-1">{p.name}</h3>
                <code className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded border border-border">{p.slug}</code>
                <p className="text-sm text-text-muted mt-3 line-clamp-2">{p.description || 'No description provided.'}</p>
                <p className="text-xs text-text-muted mt-4 pt-4 border-t border-border/50">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
