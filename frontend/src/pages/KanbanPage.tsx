import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Trash2, CircleDashed } from 'lucide-react';
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

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

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
    <div className="space-y-10 pb-20">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter">Kanban Board</h1>
          <p className="text-text-muted mt-2 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Active Task Flow</p>
        </div>
        <div className="grid grid-cols-2 lg:flex gap-2 lg:gap-4 w-full lg:w-auto">
          <select 
            value={filterProject} 
            onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[150px]"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select 
            value={filterModule} 
            onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[150px]"
          >
            <option value="">All Modules</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select 
            value={filterJobTitle} 
            onChange={e => setFilterJobTitle(e.target.value)}
            className="col-span-2 lg:col-auto px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all lg:min-w-[150px]"
          >
            <option value="">All Job Titles</option>
            {jobTitles.map(jt => <option key={jt.id} value={jt.name}>{jt.name}</option>)}
          </select>
        </div>
      </motion.div>

      <div className="flex gap-8 overflow-x-auto pb-10 custom-scrollbar snap-x h-[calc(100vh-250px)]">
        {states.map((state, idx) => {
          const columnTasks = tasks.filter(t => {
            if (t.state_slug !== state.slug) return false;
            if (filterProject && t.project?.toString() !== filterProject) return false;
            if (filterModule && t.module?.toString() !== filterModule) return false;
            if (filterJobTitle && t.assignee?.title !== filterJobTitle) return false;
            return true;
          });
          const colors = STATE_COLORS[state.slug] || STATE_COLORS['pending'];
          return (
            <motion.div 
              key={state.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-shrink-0 w-[280px] lg:w-80 flex flex-col snap-center"
            >
              <div className="flex items-center justify-between mb-6 px-4">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')} shadow-glow`}></div>
                   <h3 className={`font-extrabold text-sm uppercase tracking-widest ${colors.text}`}>{state.name}</h3>
                </div>
                <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-lg border border-white/10 opacity-60">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                 <AnimatePresence>
                  {columnTasks.map((task) => {
                    const cardColors = STATE_COLORS[task.state_slug || ''] || colors;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`glass p-6 rounded-[1.5rem] border-white/5 hover:border-primary/30 group cursor-pointer relative overflow-hidden transition-all ${
                          task.priority === 'urgent' ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]' : ''
                        } ${task.state_slug === 're-edit' ? 'border-red-500/30' : ''}`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                             <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${cardColors.bg} ${cardColors.text}`}>
                               {task.priority || 'Low'}
                             </span>
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/10 text-error rounded-lg transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                          <div className="flex flex-col gap-1.5">
                             {(() => {
                               const proj = projects.find(p => p.id === Number(task.project));
                               return proj ? (
                                 <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: proj.color }}>
                                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }}></div>
                                   {proj.name}
                                 </span>
                               ) : null;
                             })()}
                             <h4 className="font-bold text-sm leading-relaxed">{task.title}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                             <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full ${cardColors.bg.replace('/10', '')} flex items-center justify-center text-[8px] font-black text-white`}>
                                   {task.assignee?.first_name?.[0] || task.assignee?.email?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-[10px] font-bold">{task.assignee?.first_name || task.assignee?.email || 'Unassigned'}</span>
                             </div>
                             <CircleDashed className={`w-3.5 h-3.5 ${cardColors.text}`} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

              <motion.button 
                whileHover={{ scale: 1.02 }} 
                className="w-full py-4 border-2 border-dashed border-white/5 rounded-[1.5rem] flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </motion.button>
            </div>
          </motion.div>
        ); })}
      </div>
    </div>
  );
}
