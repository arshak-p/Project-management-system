import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Project, Task, TaskState } from '../api';
import { Loader2, ChevronRight } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function AgencyRoadmap() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.getProjects(),
      api.getTasks(),
      api.getStates()
    ]).then(([p, t, s]) => {
      setProjects(p.data);
      setTasks(t.data);
      setStates(s.data.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      
      <div>
        <h1 className="text-4xl font-black tracking-tight">Agency Roadmap</h1>
        <p className="text-text-muted mt-2 font-medium italic">Project-wise mission logs and active work items.</p>
      </div>

      <div className="space-y-12">
        {projects.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <p className="text-text-muted font-bold">No active orbits detected in the workspace.</p>
          </div>
        )}

        {projects.map(project => {
          const projectTasks = tasks.filter(t => t.project === project.id);
          if (projectTasks.length === 0) return null;

          return (
            <div key={project.id} className="glass rounded-[3rem] overflow-hidden border border-white/5 shadow-premium animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white/5 px-10 py-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center text-white text-2xl font-black shadow-glow">
                    {project.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl tracking-tighter">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-60">
                        {projectTasks.length} Work Items in Orbit
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="glass px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary border-primary/20">
                      Sector: {project.slug}
                   </div>
                </div>
              </div>
              
              <div className="p-6 overflow-x-auto no-scrollbar">
                <div className="flex gap-6 min-w-max p-2">
                   {states.map(state => {
                     const stateTasks = projectTasks.filter(t => t.state === state.id);
                     if (stateTasks.length === 0) return null;
                     
                     return (
                       <div key={state.id} className="w-80 flex-shrink-0 bg-white/2 rounded-[2rem] p-6 border border-white/5 group/col">
                          <div className="flex items-center justify-between mb-6 px-2">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover/col:text-primary transition-colors">{state.name}</span>
                             <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full font-black text-text-muted">{stateTasks.length}</span>
                          </div>
                          <div className="space-y-4">
                             {stateTasks.map(task => (
                               <div 
                                 key={task.id} 
                                 onClick={() => setSelectedTaskId(task.id)}
                                 className="p-5 bg-background border border-white/5 rounded-2xl hover:border-primary/40 hover:translate-y-[-4px] transition-all cursor-pointer group/card shadow-lg hover:shadow-primary/5 active:scale-95"
                               >
                                  <p className="text-[10px] font-black text-primary mb-2 uppercase tracking-widest opacity-60 group-hover/card:opacity-100 transition-opacity">{task.task_code}</p>
                                  <h4 className="text-sm font-bold line-clamp-2 mb-4 group-hover/card:text-white transition-colors leading-relaxed">{task.title}</h4>
                                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                     <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] flex items-center justify-center text-[10px] font-black text-white ring-2 ring-background">
                                          {task.assignee?.first_name?.[0] || '?' }
                                        </div>
                                        <p className="text-[9px] font-bold text-text-muted truncate max-w-[80px]">{task.assignee?.first_name || 'Unassigned'}</p>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-lg border ${
                                          task.priority === 'urgent' ? 'text-error bg-error/10 border-error/20' : 
                                          task.priority === 'high' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                          'text-text-muted bg-white/5 border-white/10'
                                        }`}>
                                           {task.priority}
                                        </span>
                                        <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-1 transition-all" />
                                     </div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                     )
                   })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
