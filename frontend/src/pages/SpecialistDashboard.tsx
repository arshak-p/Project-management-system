import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, Task } from '../api';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

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
    <div className="space-y-12 pb-24 font-inter">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white">
            My Workspace
          </h1>
          <p className="text-[10px] text-text-muted mt-2 font-bold tracking-widest uppercase opacity-60 italic">Your Active Missions for Today</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/20 rounded-xl">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Today's Work Items</h3>
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Tasks Requiring Your Action</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {personalTasks.length === 0 ? (
            <div className="p-10 bg-background/50 border border-white/5 rounded-[2rem] text-center">
              <ClipboardList className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-sm text-text-muted font-bold uppercase tracking-widest">No active tasks assigned to you right now.</p>
              <p className="text-[10px] text-text-muted/60 mt-2 italic">You are completely caught up!</p>
            </div>
          ) : (
            personalTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="p-6 bg-background border border-white/5 rounded-[2rem] flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group shadow-xl"
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
