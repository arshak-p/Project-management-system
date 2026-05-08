import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Trash2, CircleDashed, AlertTriangle } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';
import { api } from '../api';
import type { Task, TaskState, User, Project, WorkModule, JobTitle } from '../api';

const STATE_COLORS: Record<string, { bg: string, text: string, shadow: string }> = {
  'pending': { bg: 'bg-slate-500/10', text: 'text-slate-400', shadow: 'shadow-slate-500/20' },
  'in-progress': { bg: 'bg-primary/10', text: 'text-primary', shadow: 'shadow-primary/20' },
  'team-head-review': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', shadow: 'shadow-cyan-500/20' },
  'client-review': { bg: 'bg-blue-600/10', text: 'text-blue-500', shadow: 'shadow-blue-600/20' },
  're-edit': { bg: 'bg-red-500/10', text: 'text-red-400', shadow: 'shadow-red-500/20' },
  'completed-launched': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', shadow: 'shadow-emerald-500/20' },
};

export default function KanbanPage({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterJobTitle, setFilterJobTitle] = useState(me?.role === 'team_head' ? (me?.title || '') : '');
  const [filterPostingDate, setFilterPostingDate] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s, p, m, jt] = await Promise.all([api.getTasks(), api.getStates(), api.getProjects(), api.getModules(), api.getJobTitles()]);
      setTasks(t.data);
      setStates(s.data);
      setProjects(p.data);
      setModules(m.data);
      setJobTitles(jt.data);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { 
    Promise.resolve().then(() => load()); 
    const interval = setInterval(() => load(), 4000); // Accelerated Polling: 4s
    const handleUpd = () => load();
    window.addEventListener('cp-task-updated', handleUpd);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cp-task-updated', handleUpd);
    };
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm('Abort this work item permanently?')) return;
    try {
      await api.deleteTask(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col overflow-hidden">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6 px-2">
        <div>
          <h1 className="text-2xl lg:text-4xl font-black tracking-tighter">Kanban</h1>
          <p className="text-text-muted mt-1 font-bold uppercase tracking-[0.2em] text-[9px] opacity-60">Task Flow</p>
        </div>
        <div className="grid grid-cols-2 lg:flex gap-2 w-full lg:w-auto">
          <select 
            value={filterProject} 
            onChange={e => setFilterProject(e.target.value)}
            className="px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[120px]"
          >
            <option value="">Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select 
            value={filterModule} 
            onChange={e => setFilterModule(e.target.value)}
            className="px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[120px]"
          >
            <option value="">Modules</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select 
            value={filterJobTitle} 
            onChange={e => setFilterJobTitle(e.target.value)}
            className="col-span-2 lg:col-auto px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[120px]"
          >
            <option value="">Job Titles</option>
            {jobTitles.map(jt => <option key={jt.id} value={jt.name}>{jt.name}</option>)}
          </select>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar select-none">
        {states.map((state, idx) => {
          const columnTasks = tasks.filter(t => {
            if (t.state_slug !== state.slug) return false;
            if (filterProject && t.project?.toString() !== filterProject) return false;
            if (filterModule && t.module?.toString() !== filterModule) return false;
            if (filterJobTitle && t.assignee?.title !== filterJobTitle) return false;
            if (me?.role === 'specialist' && t.assignee?.id !== me?.id) return false;
            return true;
          });
          const colors = STATE_COLORS[state.slug] || STATE_COLORS['pending'];
          return (
            <motion.div 
              key={state.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="flex-shrink-0 w-[260px] lg:w-[300px] flex flex-col h-full bg-white/[0.01] rounded-[1.5rem] border border-white/5 p-3"
            >
              <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')} shadow-glow`}></div>
                   <h3 className={`font-black text-[10px] uppercase tracking-[0.2em] ${colors.text}`}>{state.name}</h3>
                </div>
                <span className="text-[9px] font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/10 opacity-40">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1 mb-3 scroll-smooth">
                 <AnimatePresence mode='popLayout'>
                  {columnTasks.map((task) => {
                    const cardColors = STATE_COLORS[task.state_slug || ''] || colors;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`glass p-4 rounded-xl border-white/5 hover:border-primary/30 group cursor-pointer relative transition-all ${
                          task.priority === 'urgent' ? 'border-red-500/40 bg-red-500/5' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-2.5">
                          <div className="flex justify-between items-start">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${cardColors.bg} ${cardColors.text}`}>
                               {task.priority || 'Low'}
                             </span>
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 text-error rounded transition-all">
                                <Trash2 className="w-3 h-3" />
                             </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                             {(() => {
                               const proj = projects.find(p => p.id === Number(task.project));
                               return proj ? (
                                 <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-60" style={{ color: proj.color }}>
                                   {proj.name}
                                 </span>
                               ) : null;
                             })()}
                             <h4 className="font-bold text-[11px] leading-tight text-text/90 line-clamp-2">{task.title}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5 opacity-40 group-hover:opacity-80">
                             <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full ${cardColors.bg.replace('/10', '')} flex items-center justify-center text-[7px] font-black text-white`}>
                                   {task.assignee?.first_name?.[0] || '?'}
                                </div>
                                <span className="text-[8px] font-bold truncate max-w-[60px]">{task.assignee?.first_name || 'User'}</span>
                             </div>
                             <CircleDashed className={`w-2.5 h-2.5 ${cardColors.text} opacity-50`} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 bg-white/5 hover:bg-primary/5 border border-white/5 hover:border-primary/10 rounded-lg flex items-center justify-center text-text-muted hover:text-primary transition-all text-[9px] font-black uppercase tracking-widest shrink-0"
              >
                <Plus className="w-3 h-3 mr-2" /> Add Task
              </motion.button>
            </motion.div>
          ); })}
      </div>
    </div>
  );
}
