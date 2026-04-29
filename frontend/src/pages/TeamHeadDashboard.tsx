import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, Task } from '../api';
import { motion } from 'framer-motion';
import { ClipboardList, Users } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function TeamHeadDashboard({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const loadData = () => {
    Promise.all([
      api.getTasks(),
      api.getActivity().catch(() => ({ data: [] })),
      api.getStates().catch(() => ({ data: [] }))
    ])
      .then(([tRes, actRes, stateRes]) => {
        setTasks(tRes.data);
        setActivities(actRes.data);
        setStates(stateRes.data);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickApprove = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    const clientReviewState = states.find(s => s.slug === 'client-review');
    if (!clientReviewState) return;
    try {
      await api.updateTask(taskId, { state: clientReviewState.id });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

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
                  <div className="flex items-center gap-2">
                    {task.state_slug === 'team-head-review' && (
                      <button 
                        onClick={(e) => handleQuickApprove(e, task.id)}
                        className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black uppercase tracking-widest text-[8px] rounded border border-emerald-500/30 transition-all hover:scale-105"
                      >
                        Approve
                      </button>
                    )}
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      task.state_slug === 'team-head-review' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-white/5 text-text-muted'
                    }`}>
                      {task.state__name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: EXTENDED LIFECYCLE TRACKER */}
      <div className="glass rounded-[2.5rem] p-8 border border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-white">Lifecycle & Tracking Ledger</h3>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1 italic">Continuous state tracking & timeline audits</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-background/30 shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface/50 border-b border-white/10">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-primary">Task</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Specialist</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Module</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Assigned</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Started</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Completed</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Target / Due</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Reworks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {teamTasks.map(task => {
                // Determine lifecycle stats using sequential state search
                const taskActs = activities.filter(a => a.entity_type === 'work_item' && a.entity_id === task.id.toString());
                
                const assignAct = taskActs.find(a => a.action === 'created');
                const assignDate = assignAct ? new Date(assignAct.created_at).toLocaleDateString() : new Date(task.created_at).toLocaleDateString();

                // Find the first time state became 'in-progress'
                const startAct = taskActs.find(a => a.payload && typeof a.payload === 'object' && (a.payload as any).state_id === 20); // 'in-progress' fallback id
                const startDate = startAct ? new Date(startAct.created_at).toLocaleDateString() : 'Pending';

                // Find the completion metrics
                const completeAct = taskActs.find(a => a.payload && typeof a.payload === 'object' && [50, 100].includes((a.payload as any).state_id)); // state fallback IDs
                const completeDate = completeAct ? new Date(completeAct.created_at).toLocaleDateString() : (['client-review', 'completed-launched'].includes(task.state_slug || '') ? new Date(task.updated_at).toLocaleDateString() : 'Ongoing');

                // Rework logic
                const reworkCount = taskActs.filter(a => a.payload && typeof a.payload === 'object' && (a.payload as any).state_id === 60).length; // 'rework-revision' id

                return (
                  <tr key={task.id} className="hover:bg-white/2 transition-colors cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                    <td className="p-4">
                      <span className="text-primary font-black uppercase tracking-widest text-[10px] block mb-1">{task.task_code}</span>
                      <span className="text-text font-bold text-xs font-inter line-clamp-1 truncate block max-w-[200px]">{task.title}</span>
                    </td>
                    <td className="p-4 text-text font-semibold capitalize font-inter">
                      {task.assignee?.first_name || 'Generic Operator'}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-surface border border-white/5 rounded text-[10px] font-bold text-text-muted uppercase">
                        {task.module_slug || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted opacity-80">{assignDate}</td>
                    <td className="p-4 text-text-muted opacity-80">{startDate}</td>
                    <td className="p-4 font-bold text-emerald-400">{completeDate}</td>
                    <td className="p-4 text-amber-500 font-bold">{task.due_date || 'No Date'}</td>
                    <td className="p-4">
                      {reworkCount > 0 ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 font-bold rounded animate-pulse">
                          {reworkCount} Cycles
                        </span>
                      ) : (
                        <span className="text-text-muted/40">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
