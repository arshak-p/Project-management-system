import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Loader2, Database, CheckCircle2, Circle, AlertTriangle, ArrowUp, ShieldCheck, X } from 'lucide-react';
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
  const [filterModule, setFilterModule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', scheduled_date: '', reference_link: '', assignee: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.getTasks({ archived: showArchived }), 
      api.getProjects(), 
      api.getStates(), 
      api.getModules(), 
      api.getAssignableUsers().catch(() => ({ data: [] }))
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
        reference_link: form.reference_link || null,
      });
      setShowForm(false);
      setForm({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', scheduled_date: '', reference_link: '', assignee: '' });
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
    if (filterModule && t.module?.id?.toString() !== filterModule) match = false;
    
    if (startDate || endDate) {
      const taskDate = (t.created_at || "").split("T")[0];
      if (startDate && taskDate < startDate) match = false;
      if (endDate && taskDate > endDate) match = false;
    }
    
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter">Work Items</h1>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1 opacity-60 italic">Live Task Engine // Agency Operations</p>
        </div>
        {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'team_head') && (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowForm(false)}></div>
          <div className="glass w-full max-w-5xl rounded-[2.5rem] border-primary/20 p-6 lg:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter italic">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              Create Work Item
            </h3>
            <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text transition-colors"><X className="w-6 h-6" /></button>
          </div>

          {error && <p className="text-error text-sm mb-6 p-4 bg-error/10 rounded-xl border border-error/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" /> {error}
          </p>}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Task Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done? *" required className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-base focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-text-muted/30" />
            </div>

            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Select Project</label>
              <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all cursor-pointer">
                <option value="">Select Project *</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Module / Scope</label>
              <select value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} required className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all cursor-pointer">
                <option value="">Select Module *</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Workflow State</label>
              <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all cursor-pointer">
                <option value="">Select State *</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Priority Level</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all cursor-pointer">
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">⚫ Low</option>
              </select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Assign Specialist</label>
              <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all cursor-pointer">
                <option value="">Unassigned (Optional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
              </select>
            </div>

            <div className="md:col-span-12 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Reference Link (Optional)</label>
              <input value={form.reference_link} onChange={e => setForm({ ...form, reference_link: e.target.value })} placeholder="https://cloud-storage.com/assets..." className="w-full px-5 py-3.5 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all placeholder:text-text-muted/30" />
            </div>

            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5cf6] ml-1">Planned Start</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="w-full px-5 py-3.5 bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-2xl text-sm focus:border-[#8b5cf6] outline-none transition-all" style={{ colorScheme: 'dark' }} />
            </div>

            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 ml-1">Final Deadline</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-5 py-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-sm focus:border-amber-500 outline-none transition-all" style={{ colorScheme: 'dark' }} />
            </div>

            <div className="md:col-span-12 flex flex-col md:flex-row gap-4 justify-between items-center pt-6 mt-6 border-t border-border/30">
              <p className="text-[10px] text-text-muted max-w-xs leading-relaxed">Fields marked with <span className="text-primary">*</span> are required to maintain workflow integrity.</p>
              <div className="flex gap-4 w-full md:w-auto">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 md:flex-none px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-text-muted hover:text-text hover:bg-white/5 rounded-2xl transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Create Task
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

      <div className="flex flex-col gap-6 p-6 lg:p-8 glass border-white/5 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="w-5 h-5 absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" />
            <input type="text" placeholder="Search task ID, title or specialist..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-2xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm placeholder:text-text-muted/40" />
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <label className="flex items-center justify-between gap-4 bg-surface/50 border border-border/50 px-6 py-3.5 rounded-2xl cursor-pointer hover:border-primary/40 transition-all shadow-sm group">
              <div className="flex items-center gap-3">
                <Database className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-text-muted'} group-hover:scale-110 transition-transform`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-text">Archives</span>
              </div>
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
              <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${showArchived ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${showArchived ? 'left-5' : 'left-1'}`}></div>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Project</label>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-xs font-bold focus:border-primary outline-none transition-all cursor-pointer">
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Module / Scope</label>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-xs font-bold focus:border-primary outline-none transition-all cursor-pointer">
              <option value="">All Modules</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">State</label>
            <select value={filterState} onChange={e => setFilterState(e.target.value)} className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-xs font-bold focus:border-primary outline-none transition-all cursor-pointer">
              <option value="">All States</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Specialist</label>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-xs font-bold focus:border-primary outline-none transition-all cursor-pointer">
              <option value="">All Employees</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 pt-4 border-t border-white/5">
          <div className="grid grid-cols-2 lg:flex items-center gap-4 flex-1 w-full">
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 ml-1">Date Range Start</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3.5 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1 ml-1">Date Range End</label>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3.5 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto self-end">
             <button 
               onClick={() => {
                 const d = new Date().toISOString().split('T')[0];
                 setStartDate(d); setEndDate(d);
               }}
               className="flex-1 lg:flex-none px-6 py-3.5 glass border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
             >
               Today
             </button>
             <button 
               onClick={() => {
                 const d = new Date();
                 const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                 const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                 setStartDate(start); setEndDate(end);
               }}
               className="flex-1 lg:flex-none px-6 py-3.5 glass border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
             >
               Month
             </button>
             <button 
               onClick={() => { setStartDate(''); setEndDate(''); setFilterProject(''); setFilterState(''); setFilterAssignee(''); setFilterModule(''); setSearch(''); }}
               className="flex-1 lg:flex-none px-6 py-3.5 bg-error/10 text-error border border-error/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-error/20 transition-all"
             >
               Reset All
             </button>
          </div>
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
                    <code className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">{task.task_code}</code>
                    {(() => {
                      const mod = modules.find(m => m.id === task.module);
                      return mod ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] bg-surface border border-border px-2 py-0.5 rounded text-primary shadow-sm shrink-0">
                          {mod.name}
                        </span>
                      ) : null;
                    })()}
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
