import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Search, Loader2, Database, CheckCircle2, Circle, AlertTriangle, ArrowUp, X, Calendar, CalendarCheck, Clock } from 'lucide-react';
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
  const [filterPostingDate, setFilterPostingDate] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [form, setForm] = useState({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', posting_date: '', due_date: '', deadline: '', scheduled_date: '', reference_link: '', assignee: '' });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getCardStyle = useCallback((t: Task) => {
    if (t.is_client_approved) {
      return 'card-emerald-glow';
    }
    if (t.state_slug === 'completed-launched') {
      return 'card-emerald-glow';
    }
    if (t.state_slug === 'rework-revision' || t.state_slug === 're-edit') {
      return 'card-red-glow';
    }
    if (['client-review', 'team-head-review'].includes(t.state_slug || '')) {
      return 'card-blue-glow';
    }
    if (t.priority === 'urgent' || (t.deadline && t.deadline < todayStr)) {
      return 'card-red-glow';
    }
    if (t.priority === 'high') {
      return 'card-amber-glow';
    }
    if (t.state_slug === 'in-progress') {
      return 'card-primary-glow';
    }
    return 'border-white/5 hover:border-primary/30';
  }, [todayStr]);


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
        deadline: form.deadline || null,
        posting_date: form.posting_date || null,
        scheduled_date: form.scheduled_date || null,
        reference_link: form.reference_link || null,
      });
      setShowForm(false);
      setForm({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', posting_date: '', due_date: '', deadline: '', scheduled_date: '', reference_link: '', assignee: '' });
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
    try {
      await api.updateTask(id, { is_active: true });
      alert('Task restored successfully.');
      load();
    } catch {
      alert('Failed to restore task. Security clearance required.');
    }
  };

  const filtered = tasks.filter(t => {
    let match = true;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.task_code?.toLowerCase().includes(search.toLowerCase())) match = false;
    if (filterProject && t.project?.toString() !== filterProject) match = false;
    if (filterState && t.state?.toString() !== filterState) match = false;
    if (filterAssignee && t.assignee?.id?.toString() !== filterAssignee) match = false;
    if (filterModule && t.module?.toString() !== filterModule) match = false;
    if (filterPostingDate && t.posting_date !== filterPostingDate) match = false;
    if (filterDueDate && t.due_date !== filterDueDate) match = false;
    if (filterDeadline && t.deadline !== filterDeadline) match = false;
    
    if (startDate || endDate) {
      const taskDate = (t.created_at || "").split("T")[0];
      if (startDate && taskDate < startDate) match = false;
      if (endDate && taskDate > endDate) match = false;
    }
    
    if (!showCompleted && t.state_slug === 'completed-launched') match = false;
    
    // Strict Privacy Protocol: Specialists only see their own assigned tasks
    if (me?.role === 'specialist' && t.assignee?.id !== me?.id) match = false;
    
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
        {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager') && (
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
          <div className="glass w-full max-w-5xl rounded-[2.5rem] border-primary/20 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 lg:p-10 border-b border-white/5">
              <h3 className="font-black text-xl lg:text-2xl flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                Create Work Item
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 text-text-muted hover:text-text hover:bg-white/5 rounded-xl transition-all"><X className="w-7 h-7" /></button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
              {error && <p className="text-error text-sm mb-8 p-5 bg-error/10 rounded-2xl border border-error/20 flex items-center gap-4">
                <AlertTriangle className="w-6 h-6" /> {error}
              </p>}

              <form id="create-task-form" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10">
                <div className="md:col-span-12 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Task Title</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done? *" required className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-base focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-text-muted/30 font-bold" />
                </div>

                <div className="md:col-span-6 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Select Project</label>
                  <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all cursor-pointer">
                    <option value="">Select Project *</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-6 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Module / Scope</label>
                  <select value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} required className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all cursor-pointer">
                    <option value="">Select Module *</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Workflow State</label>
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all cursor-pointer">
                    <option value="">Select State *</option>
                    {states
                      .filter(s => {
                        if (me?.role !== 'specialist') return true;
                        return !['client-review', 'completed-launched', 'archived'].includes(s.slug);
                      })
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Priority Level</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all cursor-pointer">
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="low">⚫ Low</option>
                  </select>
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Assign Specialist</label>
                  <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all cursor-pointer">
                    <option value="">Unassigned (Optional)</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
                  </select>
                </div>

                <div className="md:col-span-12 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Reference Link (Optional)</label>
                  <textarea value={form.reference_link} onChange={e => setForm({ ...form, reference_link: e.target.value })} placeholder="Paste multiple links here (separated by newlines)..." rows={3} className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-text-muted/30 custom-scrollbar" />
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 ml-1">Task Start Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-6 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-sm font-bold focus:border-amber-500 outline-none transition-all" style={{ colorScheme: 'dark' }} />
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 ml-1">Deadline (Finish)</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full px-6 py-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-sm font-bold focus:border-red-500 outline-none transition-all" style={{ colorScheme: 'dark' }} />
                </div>

                <div className="md:col-span-4 space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Post Date</label>
                  <input type="date" value={form.posting_date} onChange={e => setForm({ ...form, posting_date: e.target.value })} className="w-full px-6 py-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all" style={{ colorScheme: 'dark' }} />
                </div>
              </form>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="p-6 lg:p-8 bg-black/20 border-t border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-xl">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-40 italic hidden md:block">Drafting New Operational Task</p>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 md:flex-none px-10 py-4 glass border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  form="create-task-form"
                  type="submit"
                  disabled={saving}
                  className="flex-1 md:flex-none px-10 py-4 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
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
                <CheckCircle2 className={`w-4 h-4 ${showCompleted ? 'text-emerald-500' : 'text-text-muted'} group-hover:scale-110 transition-transform`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-text">Completed</span>
              </div>
              <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="sr-only" />
              <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${showCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${showCompleted ? 'left-5' : 'left-1'}`}></div>
              </div>
            </label>

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

        <div className="flex flex-col lg:flex-row items-end gap-4 pt-4 border-t border-white/5">
          <div className="grid grid-cols-2 lg:flex items-end gap-4 flex-1 w-full">
             {me?.role !== 'specialist' && (
               <div className="flex flex-col flex-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">Post Date</label>
                 <input type="date" value={filterPostingDate} onChange={e => setFilterPostingDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
               </div>
             )}
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2 ml-1">Start Date</label>
               <input type="date" value={filterDueDate} onChange={e => setFilterDueDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-2 ml-1">Deadline</label>
               <input type="date" value={filterDeadline} onChange={e => setFilterDeadline(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 ml-1">Created From</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
             <div className="flex flex-col flex-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 ml-1">Created To</label>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary font-bold shadow-sm" style={{ colorScheme: 'dark' }} />
             </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto h-[44px]">
             <button 
               onClick={() => {
                 const d = new Date().toISOString().split('T')[0];
                 setStartDate(d); setEndDate(d);
               }}
               className="flex-1 lg:flex-none h-full px-5 glass border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all whitespace-nowrap"
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
               className="flex-1 lg:flex-none h-full px-5 glass border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all whitespace-nowrap"
             >
               Month
             </button>
             <button 
               onClick={() => { 
                 setStartDate(''); setEndDate(''); setFilterProject(''); setFilterState(''); setFilterAssignee(''); setFilterModule(''); setFilterPostingDate(''); setFilterDueDate(''); setFilterDeadline(''); setSearch(''); 
                 setShowCompleted(false); setShowArchived(false);
               }}
               className="flex-1 lg:flex-none h-full px-5 bg-error/10 text-error border border-error/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-error/20 transition-all whitespace-nowrap"
             >
               Reset All
             </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="glass rounded-[2.5rem] border border-border p-6 shadow-2xl">
          <div className="space-y-6">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-bold text-lg">No tasks found</p>
              </div>
            ) : (
              filtered.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTaskId(task.id)} 
                  className={`flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-5 glass rounded-[2rem] hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden ${getCardStyle(task)} ${!task.is_active ? 'opacity-60 italic grayscale-[0.5]' : ''}`}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`p-3 rounded-xl transition-all group-hover:shadow-glow ${
                      task.is_client_approved ? 'bg-emerald-500/10 text-emerald-500' : 
                      (task.state_slug === 'rework-revision' || task.state_slug === 're-edit') ? 'bg-red-500/10 text-red-500' :
                      (['client-review', 'completed-launched'].includes(task.state_slug || '')) ? 'bg-blue-500/10 text-blue-500' : 
                      task.priority === 'urgent' ? 'bg-error/10 text-error' : 
                      task.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-primary/10 text-primary'
                    } hidden md:flex items-center justify-center`}>
                       {PRIORITY_ICONS[task.priority] || <Circle className="w-4 h-4" />}
                    </div>
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
                      {task.is_client_approved ? (
                        <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                          🟢 Client Approved
                        </span>
                      ) : ['client-review', 'completed-launched'].includes(task.state_slug || '') ? (
                        <span className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                          🔵 In-House Approved
                        </span>
                      ) : task.state_slug === 'team-head-review' ? (
                        <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                          🟡 Pending Review
                        </span>
                      ) : task.state_slug === 'rework-revision' ? (
                        <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] animate-pulse">
                          🔴 Rework / Re-Edit
                        </span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-text text-sm md:text-base mb-1 group-hover:text-white transition-colors truncate uppercase tracking-tight">{task.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-text-muted">
                      {(() => {
                        const proj = projects.find(p => p.id === Number(task.project));
                        return proj ? (
                          <span className="font-bold flex items-center gap-1.5" style={{ color: proj.color }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }}></div>
                            {proj.name}
                          </span>
                        ) : null;
                      })()}
                      <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold text-text-muted">
                        👤 {task.assignee?.first_name || task.assignee?.email || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px] font-extrabold">
                       {/* 1. Post Date */}
                       {me?.role !== 'specialist' && task.posting_date && (
                          <div className="flex items-center gap-1.5 text-sky-400 bg-sky-950/20 px-2.5 py-0.5 rounded border border-sky-500/20 shadow-sm shrink-0">
                             <Calendar className="w-3 h-3 text-sky-400" />
                             <span>POSTED: {task.posting_date}</span>
                          </div>
                       )}
                       {/* 2. Start Date */}
                       {task.scheduled_date && (
                          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/20 px-2.5 py-0.5 rounded border border-emerald-500/20 shadow-sm shrink-0">
                             <CalendarCheck className="w-3 h-3 text-emerald-400" />
                             <span>START: {task.scheduled_date}</span>
                          </div>
                       )}
                       {/* 3. Due Date */}
                       {task.due_date && (
                          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/20 px-2.5 py-0.5 rounded border border-amber-500/20 shadow-sm shrink-0">
                             <Clock className="w-3 h-3 text-amber-400" />
                             <span>DUE: {task.due_date}</span>
                          </div>
                       )}
                       {/* 4. Deadline */}
                       {task.deadline && (
                          <div className="flex items-center gap-1.5 text-red-400 bg-red-950/35 px-2.5 py-0.5 rounded border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse shrink-0">
                             <AlertTriangle className="w-3 h-3 text-red-500" />
                             <span className="font-black">DEADLINE: {task.deadline}</span>
                          </div>
                       )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
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
              ))) }
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
