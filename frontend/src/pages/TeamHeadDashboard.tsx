import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { User, Task } from '../api';
import { motion } from 'framer-motion';
import { ClipboardList, Users, Clock, AlertTriangle, Calendar } from 'lucide-react';
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
    const interval = setInterval(() => loadData(), 8000);
    const handleUpd = () => loadData();
    window.addEventListener('cp-task-updated', handleUpd);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cp-task-updated', handleUpd);
    };
  }, []);

  const handleQuickApprove = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    const clientReviewState = states.find(s => s.slug === 'client-review');
    if (!clientReviewState) return;
    const oldTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, state_slug: 'client-review', state: clientReviewState.id } : t));
    try {
      await api.updateTask(taskId, { state: clientReviewState.id });
      loadData();
    } catch (err) {
      console.error(err);
      setTasks(oldTasks);
    }
  };

  const handleQuickReject = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    const reworkState = states.find(s => s.slug === 'rework-revision');
    if (!reworkState) return;
    const oldTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, state_slug: 'rework-revision', state: reworkState.id } : t));
    try {
      await api.updateTask(taskId, { state: reworkState.id });
      loadData();
    } catch (err) {
      console.error(err);
      setTasks(oldTasks);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

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
        
        <div>
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
                  className={`p-5 glass rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-all cursor-pointer group gap-4 ${getCardStyle(task)}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{task.task_code}</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                        task.state_slug === 'pending' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                        task.state_slug === 'in-progress' ? 'bg-primary/10 text-primary border-primary/20' :
                        task.state_slug === 'team-head-review' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        task.state_slug === 'client-review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-text-muted border-white/10'
                      }`}>
                        {task.state__name || task.state_slug}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-muted group-hover:text-white transition-colors uppercase tracking-wide">{task.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-text-muted font-bold">
                       {task.posting_date && (
                          <div className="flex items-center gap-1 text-sky-400 bg-sky-950/20 px-2 py-0.5 rounded border border-sky-500/20">
                             <Calendar className="w-2.5 h-2.5" /> {task.posting_date}
                          </div>
                       )}
                       {task.due_date && (
                          <div className="flex items-center gap-1 text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">
                             <Clock className="w-2.5 h-2.5" /> {task.due_date}
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
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
                  className={`p-5 glass rounded-[2rem] flex flex-col hover:bg-white/5 transition-all cursor-pointer group gap-4 ${getCardStyle(task)}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/20">{task.task_code} • {task.project__slug || 'GENERAL'} {task.module_slug && `• ${task.module_slug}`}</span>
                        {task.is_client_approved ? (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">🟢 Client Approved</span>
                        ) : ['client-review', 'completed-launched'].includes(task.state_slug || '') ? (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">🔵 In-House Approved</span>
                        ) : null}
                      </div>
                      <h4 className="text-xs font-bold text-text-muted group-hover:text-white transition-colors uppercase tracking-wide truncate">{task.title}</h4>
                      <span className="text-[8px] font-black uppercase text-text-muted/50 block">Assignee: {task.assignee?.first_name || 'Generic Operator'} • Status: {task.state__name || task.state_slug?.replace(/-/g, ' ')}</span>
                      
                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-text-muted font-bold mt-2">
                         {task.posting_date && (
                            <div className="flex items-center gap-1 text-sky-400 bg-sky-950/20 px-2 py-0.5 rounded border border-sky-500/20">
                               <Calendar className="w-2.5 h-2.5" /> {task.posting_date}
                            </div>
                         )}
                         {task.due_date && (
                            <div className="flex items-center gap-1 text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">
                               <Clock className="w-2.5 h-2.5" /> {task.due_date}
                            </div>
                         )}
                         {task.deadline && (
                            <div className="flex items-center gap-1 text-red-400 bg-red-950/35 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                               <AlertTriangle className="w-2.5 h-2.5 text-red-500" /> {task.deadline}
                            </div>
                         )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {task.state_slug === 'team-head-review' && (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => handleQuickApprove(e, task.id)}
                            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black uppercase tracking-widest text-[8px] rounded border border-emerald-500/30 transition-all hover:scale-105"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={(e) => handleQuickReject(e, task.id)}
                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black uppercase tracking-widest text-[8px] rounded border border-red-500/30 transition-all hover:scale-105"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                        task.state_slug === 'team-head-review' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-white/5 text-text-muted'
                      }`}>
                        {task.state__name}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
                const taskActs = activities.filter(a => a.entity_type === 'work_item' && a.entity_id === task.id.toString());
                
                const assignAct = taskActs.find(a => a.action === 'created');
                const assignDate = assignAct ? new Date(assignAct.created_at).toLocaleDateString() : new Date(task.created_at).toLocaleDateString();

                const startAct = taskActs.find(a => a.payload && typeof a.payload === 'object' && (a.payload as any).state_id === 20); 
                const startDate = startAct ? new Date(startAct.created_at).toLocaleDateString() : 'Pending';

                const completeAct = taskActs.find(a => a.payload && typeof a.payload === 'object' && [50, 100].includes((a.payload as any).state_id)); 
                const completeDate = completeAct ? new Date(completeAct.created_at).toLocaleDateString() : (['client-review', 'completed-launched'].includes(task.state_slug || '') ? new Date(task.updated_at).toLocaleDateString() : 'Ongoing');

                const reworkCount = taskActs.filter(a => a.payload && typeof a.payload === 'object' && (a.payload as any).state_id === 60).length; 

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
