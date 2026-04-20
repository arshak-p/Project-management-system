import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Trash2, CircleDashed } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';
import { api } from '../api';
import type { Task, TaskState } from '../api';

export default function KanjiBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.getTasks(), api.getStates()]);
      setTasks(t.data);
      setStates(s.data);
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
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-5xl font-black tracking-tighter">Kanban Board</h1>
        <p className="text-text-muted mt-2 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Active Task Flow</p>
      </motion.div>

      <div className="flex gap-8 overflow-x-auto pb-10 custom-scrollbar snap-x h-[calc(100vh-250px)]">
        {states.map((state, idx) => (
          <motion.div 
            key={state.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex-shrink-0 w-80 flex flex-col snap-start"
          >
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shadow-glow"></div>
                 <h3 className="font-extrabold text-sm uppercase tracking-widest">{state.name}</h3>
              </div>
              <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-lg border border-white/10 opacity-60">
                {tasks.filter(t => t.state_slug === state.slug).length}
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
               <AnimatePresence>
                {tasks.filter(t => t.state_slug === state.slug).map((task) => (
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
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                         <span className="text-[10px] font-black uppercase text-primary tracking-widest px-2 py-0.5 bg-primary/10 rounded-lg">
                           {task.priority || 'Low'}
                         </span>
                         <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/10 text-error rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                      <h4 className="font-bold text-sm leading-relaxed">{task.title}</h4>
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[8px] font-black text-white">
                               {task.assignee_name?.[0] || '?'}
                            </div>
                            <span className="text-[10px] font-bold">{task.assignee_name || 'Unassigned'}</span>
                         </div>
                         <CircleDashed className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                className="w-full py-4 border-2 border-dashed border-white/5 rounded-[1.5rem] flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
