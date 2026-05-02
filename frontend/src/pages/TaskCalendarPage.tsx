import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Task, Project, TaskState, WorkModule, User } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Calendar as CalendarIcon, Clock, 
  X, Info, CheckCircle2, Loader2
} from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function TaskCalendarPage({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', assignee: '' });
  
  const [filterProject, setFilterProject] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    // Faster, parallel promise execution with partial recovery
    api.getTasks().then(r => setTasks(r.data)).catch(console.error);
    api.getProjects().then(r => setProjects(r.data)).catch(console.error);
    api.getStates().then(r => setStates(r.data)).catch(console.error);
    api.getModules().then(r => setModules(r.data)).catch(console.error);
    api.getAssignableUsers().then(r => setUsers(r.data)).catch(() => setUsers([]));

    // Finally resolve the loading state when a core set is ready
    Promise.allSettled([api.getTasks(), api.getProjects()])
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.createTask({
        ...form,
        project: Number(form.project),
        state: Number(form.state),
        module: Number(form.module),
        assignee: form.assignee ? Number(form.assignee) : null,
        due_date: form.due_date || null,
      });
      setShowCreateModal(false);
      setForm({ title: '', description: '', project: '', state: '', module: '', priority: 'medium', due_date: '', assignee: '' });
      load();
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to create task. Check inputs.');
    } finally { setSaving(false); }
  };

  const getFilteredTasks = useCallback(() => {
    return tasks.filter(t => {
      if (filterProject && t.project?.toString() !== filterProject) return false;
      if (filterModule && t.module?.toString() !== filterModule) return false;
      return true;
    });
  }, [tasks, filterProject, filterModule]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getTasksForDay = (day: number) => {
    const filtered = getFilteredTasks();
    return filtered.filter(t => {
      const targetDate = t.posting_date || t.deadline || t.due_date;
      if (!targetDate) return false;
      const d = new Date(targetDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const dayCells = [];
  const totalDays = daysInMonth(currentDate);
  const offset = startOfMonth(currentDate);

  for (let i = 0; i < offset; i++) dayCells.push(null);
  for (let d = 1; d <= totalDays; d++) dayCells.push(d);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
       <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20 font-inter">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Tactical Operations</h1>
          <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60 italic">Monthly Campaign // Active Coordinates</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="px-4 py-3 glass border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all"
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select 
              value={filterModule} 
              onChange={e => setFilterModule(e.target.value)}
              className="px-4 py-3 glass border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all"
            >
              <option value="">All Modules</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="glass flex p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-primary text-white shadow-glow' : 'text-text-muted hover:text-text'}`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setViewMode('agenda')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'agenda' ? 'bg-primary text-white shadow-glow' : 'text-text-muted hover:text-text'}`}
            >
              Agenda
            </button>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#d946ef] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-premium hover:opacity-90 transition-all ml-auto"
          >
            <Plus className="w-4 h-4" /> Deploy Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bento-card p-0 overflow-hidden">
            <div className="p-8 flex items-center justify-between border-b border-white/5 bg-surface/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-text">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 border border-white/10 rounded-xl hover:bg-white/5 text-text-muted hover:text-text transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text hover:border-text/20 transition-all">Today</button>
                <button onClick={nextMonth} className="p-2 border border-white/10 rounded-xl hover:bg-white/5 text-text-muted hover:text-text transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 mb-4 px-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-text-muted py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                  {dayCells.map((day, idx) => {
                    const dayTasks = day ? getTasksForDay(day) : [];
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                    return (
                      <div 
                        key={idx} 
                        className={`min-h-[140px] p-4 bg-background/40 hover:bg-white/5 transition-all relative group cursor-pointer border-r border-b border-white/5 ${!day ? 'bg-transparent pointer-events-none' : ''}`}
                        onClick={() => {
                          if (!day) return;
                          const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          setSelectedDay(d);
                        }}
                      >
                        {day && (
                          <>
                            <div className="flex justify-between items-start mb-3">
                              <span className={`text-sm font-black transition-all ${isToday ? 'bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full shadow-glow' : 'text-text-muted/40 group-hover:text-text-muted'}`}>
                                {day}
                              </span>
                              {dayTasks.length > 0 && (
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {dayTasks.slice(0, 3).map((t, i) => (
                                    <div key={t.id} className={`w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm ${
                                      t.priority === 'urgent' ? 'bg-error' : 
                                      t.priority === 'high' ? 'bg-orange-500' : 
                                      'bg-primary'
                                    }`} style={{ zIndex: 3-i }}></div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {dayTasks.slice(0, 3).map(t => (
                                <div 
                                  key={t.id} 
                                  onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); }}
                                  className={`px-2 py-1.5 rounded-xl text-[9px] font-black truncate border transition-all flex justify-between items-center gap-2 ${
                                    t.priority === 'urgent' ? 'bg-error/10 text-error border-error/20 hover:bg-error/20' : 
                                    t.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : 
                                    'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                  }`}
                                >
                                  <span>{t.title}</span>
                                  {t.due_date && (
                                    <span className="bg-white/10 px-1 rounded-md opacity-60 text-[7px] whitespace-nowrap">DO: {new Date(t.due_date).getDate()}</span>
                                  )}
                                </div>
                              ))}
                              {dayTasks.length > 3 && (
                                <p className="text-[8px] font-black text-text-muted/40 pl-2 uppercase tracking-widest mt-1">+{dayTasks.length - 3} Units</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bento-card p-8 bg-surface/40">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center gap-2">
              <Info className="w-3 h-3" /> Selection Details
            </h4>
            <AnimatePresence mode="wait">
              {selectedDay ? (
                <motion.div 
                  key={selectedDay.toISOString()}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-sm font-black italic">{selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <p className="text-[10px] font-bold text-text-muted mt-1 underline decoration-primary/20">Sector Agenda Analysis</p>
                  </div>
                  
                  <div className="space-y-3">
                    {getTasksForDay(selectedDay.getDate()).length > 0 ? (
                      getTasksForDay(selectedDay.getDate()).map(t => (
                        <div 
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="p-4 glass rounded-[1.5rem] border border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black text-primary opacity-60">{t.task_code}</p>
                            <span className={`w-2 h-2 rounded-full ${t.priority === 'urgent' ? 'bg-error shadow-glow-error' : 'bg-primary shadow-glow'}`}></span>
                          </div>
                          <p className="text-xs font-bold leading-relaxed">{t.title}</p>
                          <div className="flex flex-col gap-2 mt-3">
                            <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                              <CalendarIcon className="w-3 h-3 text-emerald-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Post: {t.posting_date ? new Date(t.posting_date).toLocaleDateString() : 'TBD'}</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                              <Clock className="w-3 h-3 text-primary" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Start: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center glass rounded-3xl border border-dashed border-white/10">
                        <Info className="w-6 h-6 text-text-muted/20 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-loose">No active operations<br/>scheduled for this coordinate</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setForm({ ...form, due_date: selectedDay.toISOString().split('T')[0] });
                      setShowCreateModal(true);
                    }}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-primary/30 transition-all"
                  >
                    Add Task for this day
                  </button>
                </motion.div>
              ) : (
                <div className="p-10 text-center opacity-40 italic">
                  <p className="text-sm font-bold text-text-muted">Select a temporal sector<br/>to analyze active tasks.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="bento-card p-8 bg-gradient-to-br from-primary/10 to-transparent">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4 italic">Upcoming Milestones</h4>
             <div className="space-y-4">
                {tasks.filter(t => (t.posting_date || t.deadline || t.due_date) && new Date(t.posting_date || t.deadline || t.due_date!) > new Date()).slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => setSelectedTaskId(t.id)}>
                    <div className="w-1.5 h-10 bg-primary/20 rounded-full overflow-hidden">
                      <div className="w-full h-1/2 bg-primary"></div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold line-clamp-1 group-hover:text-primary transition-colors">{t.title}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Post: {t.posting_date ? new Date(t.posting_date).toLocaleDateString() : 'TBD'}</p>
                      <p className="text-[8px] font-black text-text-muted/60 uppercase tracking-widest">Start: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="w-full max-w-2xl glass rounded-[2.5rem] border border-white/10 shadow-premium p-10 relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-[#d946ef] to-primary"></div>
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Deploy New Operation</h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mt-1 opacity-60 italic">Task Creation Sequence</p>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-white/5 rounded-2xl text-text-muted hover:text-text transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {error && <p className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl text-xs font-bold text-error">{error}</p>}

                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Operation Title</label>
                       <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be achieved?" required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Assigned Project</label>
                       <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm appearance-none">
                         <option value="">Select Target...</option>
                         {projects.map(p => <option key={p.id} value={p.id} className="bg-background">{p.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Work Flow State</label>
                       <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm appearance-none">
                         <option value="">Select State...</option>
                         {states.map(s => <option key={s.id} value={s.id} className="bg-background">{s.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Module Category</label>
                       <select value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm appearance-none">
                         <option value="">Select Module...</option>
                         {modules.map(m => <option key={m.id} value={m.id} className="bg-background">{m.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Priority Rating</label>
                       <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm appearance-none text-primary">
                         <option value="urgent" className="bg-background text-error">🔴 URGENT</option>
                         <option value="high" className="bg-background text-orange-500">🟠 HIGH</option>
                         <option value="medium" className="bg-background text-primary">🔵 MEDIUM</option>
                         <option value="low" className="bg-background text-text-muted">⚪ LOW</option>
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Operator (Assignee)</label>
                       <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm appearance-none">
                         <option value="">Select Operator...</option>
                         {users.map(u => <option key={u.id} value={u.id} className="bg-background">{u.first_name || u.email}</option>)}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-text-muted/60">Deadline (Temporal)</label>
                       <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-primary outline-none font-bold text-sm" style={{ colorScheme: 'dark' }} />
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end pt-6">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-text transition-colors">Abort</button>
                    <button type="submit" disabled={saving} className="px-10 py-4 bg-gradient-to-r from-primary to-[#d946ef] text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-premium hover:opacity-90 disabled:opacity-50 flex items-center gap-3">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Deploy Unit
                    </button>
                  </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(selectedTaskId && !showCreateModal) && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
          me={me}
        />
      )}
    </div>
  );
}
