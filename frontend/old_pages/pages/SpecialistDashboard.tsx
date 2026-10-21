import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, Task } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.06, duration: 0.42, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
  }),
  exit: { opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.2 } }
};

export default function SpecialistDashboard({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const loadData = () => {
    api.getTasks()
      .then((tRes) => {
        setTasks(tRes.data);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 8000);
    const handleUpd = () => loadData();
    window.addEventListener('cp-task-updated', handleUpd);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cp-task-updated', handleUpd);
    };
  }, []);

  const activeTasks = tasks.filter(t => t.is_active && !['completed-launched', 'archived'].includes(t.state_slug || ''));
  const personalTasks = activeTasks.filter(t => t.assignee?.id === me?.id);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-12 pb-24 font-inter"
    >
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}

      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white">
            My Workspace
          </h1>
          <p className="text-[10px] text-text-muted mt-2 font-bold tracking-widest uppercase opacity-60 italic">Your Active Missions for Today</p>
        </div>
      </motion.div>

      <div className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-3 bg-primary/20 rounded-xl shadow-glow"
          >
            <ClipboardList className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h3 className="text-xl font-black text-white">Today's Work Items</h3>
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Tasks Requiring Your Action</p>
          </div>
        </motion.div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {personalTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="p-10 bg-background/50 border border-white/5 rounded-[2rem] text-center"
            >
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <ClipboardList className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              </motion.div>
              <p className="text-sm text-text-muted font-bold uppercase tracking-widest">No active tasks assigned to you right now.</p>
              <p className="text-[10px] text-text-muted/60 mt-2 italic">You are completely caught up!</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {personalTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  onClick={() => setSelectedTaskId(task.id)}
                  whileHover={{ y: -3, scale: 1.005 }}
                  className="task-card p-6 bg-background border border-white/5 rounded-[2rem] flex items-center justify-between cursor-pointer group shadow-xl"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">{task.task_code} • {task.project__slug || 'GENERAL'}</span>
                    <h4 className="text-base font-bold text-text-muted group-hover:text-white transition-colors">{task.title}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-text-muted px-4 py-2 rounded-xl border border-white/10">
                      {task.state__name}
                    </span>
                    {task.due_date && (
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Due: {task.due_date}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
