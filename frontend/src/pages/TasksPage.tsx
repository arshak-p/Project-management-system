import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Loader2, Database, CheckCircle2, Circle, AlertTriangle, ArrowUp, ShieldCheck } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';
import { api } from '../api';
import type { Project, TaskState, WorkModule, User, Task } from '../api';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-400/10',
  high: 'text-orange-400 bg-orange-400/10',
  medium: 'text-blue-400 bg-blue-400/10',
  low: 'text-slate-400 bg-slate-400/10',
};
const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertTriangle className="w-3 h-3" />,
  high: <ArrowUp className="w-3 h-3" />,
  medium: <Circle className="w-3 h-3" />,
  low: <Circle className="w-3 h-3" />,
};

export default function TasksPage({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState(localStorage.getItem('jump_project_filter') || '');
  const [filterState, setFilterState] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [form, setForm] = useState({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', scheduled_date: '', assignee: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.getTasks({ archived: showArchived }), 
      api.getProjects(), 
      api.getStates(), 
      api.getModules(), 
      api.getAssignableUsers().catch(() => ({ data: [] })),
      api.getJobTitles().catch(() => ({ data: [] }))
    ])
      .then(([t, p, s, m, u]) => {
        setTasks(t.data);
        setProjects(p.data);
        setStates(s.data);
        setModules(m.data);
        setUsers(u.data);
      })
      .catch((err) => console.error('Fetching issue on Tasks:', err))
      .finally(() => setIsLoading(false));
  }, [showArchived]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    localStorage.setItem('jump_project_filter', filterProject);
  }, [filterProject]);

  useEffect(() => {
    if (showForm && states.length === 0) {
      api.getStates().then(s => setStates(s.data));
    }
  }, [showForm, states.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { ...formRest } = form;
      await api.createTask({
        ...formRest,
        project: Number(form.project),
        state: Number(form.state),
        module: Number(form.module),
        assignee_id: form.assignee ? Number(form.assignee) : null,
        due_date: form.due_date || null,
        scheduled_date: form.scheduled_date || null,
      });
      setShowForm(false);
      setForm({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', scheduled_date: '', assignee: '' });
      load();
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      setError(JSON.stringify(errorData || 'Failed to create task'));
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: number) => {
    if (!confirm('Archive this task to historical data?')) return;
    await api.deleteTask(id);
    load();
  };

  const handleRestore = async (id: number) => {
    if (!confirm('Restore this task to active work items?')) return;
    await api.updateTask(id, { is_active: true });
    load();
  };

  const filtered = tasks.filter(t => {
    let match = true;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.task_code?.toLowerCase().includes(search.toLowerCase())) match = false;
    if (filterProject && t.project?.toString() !== filterProject) match = false;
    if (filterState && t.state?.toString() !== filterState) match = false;
    if (filterAssignee && t.assignee?.id?.toString() !== filterAssignee) match = false;
    return match;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
          me={me}
        />
      )}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Work Items</h1>
          <p className="text-text-muted mt-1">Create, manage and track all tasks across clients.</p>
        </div>
        {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'team_head') && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl font-medium shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)] hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass rounded-2xl border border-primary/30 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Create Work Item</h3>
          {error && <p className="text-error text-sm mb-4 p-3 bg-error/10 rounded-lg border border-error/20">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title *" required className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
            </div>
            <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none">
              <option value="">Select Project *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none">
              <option value="">Select State *</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} required className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none">
              <option value="">Select Module *</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none">
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">⚫ Low</option>
            </select>
            <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none">
              <option value="">Assign To (Optional)</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
            </select>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Planned Start</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" style={{ colorScheme: 'dark' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Final Deadline</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" style={{ colorScheme: 'dark' }} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-text-muted" />
            <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <label className="flex items-center justify-between gap-3 bg-surface border border-border px-5 py-3 rounded-xl cursor-pointer hover:border-primary transition-all">
            <div className="flex items-center gap-3">
              <Database className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-text-muted'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Show Archived</span>
            </div>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showArchived ? 'left-4.5' : 'left-0.5'}`}></div>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 lg:flex gap-2 lg:gap-3">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-3 bg-surface border border-border rounded-xl text-[11px] lg:text-sm font-bold focus:border-primary outline-none lg:min-w-[150px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterState} onChange={e => setFilterState(e.target.value)} className="px-3 py-3 bg-surface border border-border rounded-xl text-[11px] lg:text-sm font-bold focus:border-primary outline-none lg:min-w-[150px]">
            <option value="">All States</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="col-span-2 lg:col-auto px-3 py-3 bg-surface border border-border rounded-xl text-[11px] lg:text-sm font-bold focus:border-primary outline-none lg:min-w-[150px]">
            <option value="">All Employees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border/40">
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-bold text-lg">No tasks found</p>
              </div>
            )}
            {filtered.map(task => (
              <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-5 py-4 hover:bg-surface/30 transition-all group cursor-pointer relative overflow-hidden ${!task.is_active ? 'opacity-60 italic grayscale-[0.5]' : ''} ${task.priority === 'urgent' ? 'bg-red-500/5 border-l-2 border-red-500' : ''} ${task.state_slug === 'client-review' ? 'bg-[#8b5cf6]/5 border-l-4 border-l-[#8b5cf6]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 hidden md:block ${task.state_slug === 'client-review' ? 'bg-[#8b5cf6]' : task.priority === 'urgent' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary'}`}></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{task.task_code}</code>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority] || 'text-text-muted'}`}>
                      {PRIORITY_ICONS[task.priority]} {task.priority}
                    </span>
                    {task.is_client_approved && (
                      <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> Approved
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text text-sm md:text-base mb-1 truncate">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-xs text-text-muted">
                    {(() => {
                      const proj = projects.find(p => p.id === Number(task.project));
                      return proj ? (
                        <span className="font-bold flex items-center gap-1.5" style={{ color: proj.color }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }}></div>
                          {proj.name}
                        </span>
                      ) : null;
                    })()}
                    {task.due_date && <span className="flex items-center gap-1 opacity-60">🚩 {task.due_date}</span>}
                    <span className="md:hidden font-black text-primary/60 uppercase tracking-widest ml-auto">
                      {states.find(s => s.id === task.state)?.name}
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  {(() => {
                    const stateObj = states.find(s => s.id === task.state);
                    return (
                      <span 
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all"
                        style={{ 
                          borderColor: `${stateObj?.color || '#3b82f6'}40`,
                          color: stateObj?.color || '#3b82f6',
                          backgroundColor: `${stateObj?.color || '#3b82f6'}10`
                        }}
                      >
                        {stateObj?.name || 'Unknown'}
                      </span>
                    );
                  })()}
                  {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager') && (
                    task.is_active ? (
                      <button onClick={(e) => { e.stopPropagation(); handleArchive(task.id); }} title="Archive Task" className="p-2 opacity-0 group-hover:opacity-100 hover:bg-amber-500/10 hover:text-amber-500 text-text-muted rounded-lg transition-all">
                        <Database className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleRestore(task.id); }} title="Restore Task" className="p-2 opacity-0 group-hover:opacity-100 hover:bg-emerald-500/10 hover:text-emerald-500 text-text-muted rounded-lg transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/50 bg-surface/20 text-xs text-text-muted flex justify-between items-center">
              <span>Showing {filtered.length} of {tasks.length} tasks</span>
              <span>{tasks.filter(t => t.priority === 'urgent').length} urgent</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
