import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, Task } from '../api';
import { motion } from 'framer-motion';
import { ClipboardList, Users } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function TeamHeadDashboard({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    api.getTasks()
      .then(r => setTasks(r.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const personalTasks = tasks.filter(t => t.assignee?.id === me?.id);
  const teamTasks = tasks.filter(t => t.assignee?.id !== me?.id);

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
            Lead Overview
          </h1>
          <p className="text-[10px] text-text-muted mt-2 font-bold tracking-widest uppercase opacity-60 italic">Personal Workflow // Team Output</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* SECTION 1: PERSONAL WORK */}
        <div className="glass rounded-[2.5rem] p-8 border border-primary/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/20 rounded-xl">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Personal Workspace</h3>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Your Assigned missions</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
            {personalTasks.length === 0 ? (
              <p className="text-xs text-text-muted/40 text-center py-10 font-bold uppercase italic">No active personal tasks.</p>
            ) : (
              personalTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-4 bg-background border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary">{task.task_code}</span>
                    <h4 className="text-xs font-bold text-text-muted group-hover:text-white transition-colors">{task.title}</h4>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-white/5 text-text-muted px-2.5 py-1 rounded-lg">
                    {task.state__name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 2: TEAM WORK */}
        <div className="glass rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[#8b5cf6]/20 rounded-xl">
              <Users className="w-6 h-6 text-[#8b5cf6]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Team Operations</h3>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Review Pipeline</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
            {teamTasks.length === 0 ? (
              <p className="text-xs text-text-muted/40 text-center py-10 font-bold uppercase italic">No team tasks in the pipeline.</p>
            ) : (
              teamTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-4 bg-background border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#8b5cf6]">{task.task_code}</span>
                    <h4 className="text-xs font-bold text-text-muted group-hover:text-white transition-colors">{task.title}</h4>
                    <span className="text-[8px] font-black uppercase text-text-muted/40 block mt-1">Assignee: {task.assignee?.first_name || 'Generic Operator'}</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    task.state_slug === 'team-head-review' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-white/5 text-text-muted'
                  }`}>
                    {task.state__name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
