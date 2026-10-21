import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api';
import type { User, Task, AnalyticsSummary } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CircleDashed, Clock, AlertTriangle, ArrowUp, Circle,
  ClipboardList, TrendingUp, Star, Zap, ChevronRight,
  BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';
import TaskDetailModal from '../../components/TaskDetailModal';

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertTriangle className="w-4 h-4" />,
  high: <ArrowUp className="w-4 h-4" />,
  medium: <Circle className="w-4 h-4" />,
  low: <Circle className="w-4 h-4" />,
};

const COLORS = ['#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

interface ProjectAnalytics {
  project__slug: string;
  project__name: string;
  c: number;
}

export default function MyTasksPage({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'todays_task' | 'start_date' | 'due_date' | 'deadline' | 'completed' | 'all'>('todays_task');
  const [activeTab, setActiveTab] = useState<'tasks' | 'performance'>('tasks');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = useCallback(() => {
    const personalFilter = localStorage.getItem('access_token') ? { personal: 'true' } : {};
    Promise.all([
      api.getTasks(), 
      api.getAnalytics(personalFilter)
    ])
      .then(([t, a]) => {
        setAnalytics(a.data);
        const myTasks = t.data.filter((task: Task) => (task.assignee?.id === me?.id));
        setTasks(myTasks);
      })
      .catch(err => console.error("Error fetching my tasks:", err))
      .finally(() => setIsLoading(false));
  }, [me?.id]);

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

  const projectChartData = useMemo(() => {
    return (analytics?.by_project as ProjectAnalytics[] | undefined)?.map((p: ProjectAnalytics) => ({
      name: p.project__name,
      value: p.c
    })) || [];
  }, [analytics]);

  const stateChartData = useMemo(() => {
    return analytics?.by_state?.map(s => ({
      name: s.state__name,
      tasks: s.c
    })) || [];
  }, [analytics]);

  const todayStr = new Date().toISOString().split('T')[0];

  const PRIORITY_WEIGHT: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

  const getTaskBorderColor = (t: Task) => {
    if (t.state_slug === 'completed-launched' || t.state_slug === 'archived' || t.is_client_approved) {
      return 'border-emerald-500/20'; // Clean faint green for completed / client approved tasks
    }
    
    // 1. Critical Deadline-based Checks
    if (t.deadline) {
      if (t.deadline < todayStr) {
        return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]'; // Overdue deadline (Critical Red)
      }
      if (t.deadline === todayStr) {
        return 'border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'; // Deadline is TODAY (Pulsing Red)
      }
      // Calculate days until deadline
      const diffTime = new Date(t.deadline).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        return 'border-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.2)]'; // Deadline within 3 days (Orange warning)
      }
    }

    // 2. Due Date-based Checks
    if (t.due_date) {
      if (t.due_date < todayStr) {
        return 'border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'; // Overdue due date (Amber)
      }
      if (t.due_date === todayStr) {
        return 'border-yellow-400/80 shadow-[0_0_12px_rgba(234,179,8,0.2)]'; // Due TODAY (Yellow)
      }
      // Calculate days until due date
      const diffTime = new Date(t.due_date).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        return 'border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.1)]'; // Due within 3 days (Faint Yellow)
      }
    }

    // 3. Start Date / Posting Date Checks (Active / In-progress)
    if (t.posting_date) {
      if (t.posting_date <= todayStr) {
        return 'border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]'; // Active task from/after start date (Sleek Green)
      }
    }

    if (t.state_slug === 'in-progress') {
      return 'border-primary/40 shadow-[0_0_8px_rgba(16,185,129,0.05)]'; // General In-Progress fallback border
    }

    if (t.priority === 'urgent') {
      return 'border-red-500/20'; // Faint warning border for urgent tasks without dates
    }

    return 'border-white/5';
  };


  const filteredTasks = tasks.filter(t => {
    const isCompleted = t.state_slug === 'completed-launched' || t.state_slug === 'archived';
    if (filter === 'todays_task') {
      return !isCompleted;
    }
    if (filter === 'start_date') {
      return !isCompleted && !!t.posting_date;
    }
    if (filter === 'due_date') {
      return !isCompleted && t.due_date === todayStr;
    }
    if (filter === 'deadline') {
      return !isCompleted && t.due_date && t.due_date < todayStr;
    }
    if (filter === 'completed') {
      return isCompleted;
    }
    return true; // 'all'
  }).sort((a, b) => {
    const pA = PRIORITY_WEIGHT[a.priority || 'medium'] || 99;
    const pB = PRIORITY_WEIGHT[b.priority || 'medium'] || 99;
    if (pA !== pB) return pA - pB;
    // secondary sort by due date
    const dA = a.due_date || '9999-99-99';
    const dB = b.due_date || '9999-99-99';
    return dA.localeCompare(dB);
  });

  const activeCount = tasks.filter(t => t.state_slug !== 'completed-launched' && t.state_slug !== 'archived').length;
  const startDateCount = tasks.filter(t => t.state_slug !== 'completed-launched' && t.state_slug !== 'archived' && !!t.posting_date).length;
  const dueTodayCount = tasks.filter(t => t.state_slug !== 'completed-launched' && t.state_slug !== 'archived' && t.due_date === todayStr).length;
  const overdueCount = tasks.filter(t => t.state_slug !== 'completed-launched' && t.state_slug !== 'archived' && t.due_date && t.due_date < todayStr).length;
  const completedCount = tasks.filter(t => t.state_slug === 'completed-launched' || t.state_slug === 'archived').length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 font-inter">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-inter">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
          me={me}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">Member Ops</h1>
          <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60 flex items-center gap-3 italic">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div> Active Matrix // {me?.first_name || 'Operator'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 glass border border-white/5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-primary text-white shadow-glow' : 'text-text-muted hover:text-text'}`}
          >
            Resolution
          </button>
          <button 
            onClick={() => setActiveTab('performance')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'performance' ? 'bg-primary text-white shadow-glow' : 'text-text-muted hover:text-text'}`}
          >
            Velocity
          </button>
        </div>
      </div>

      {activeTab === 'performance' ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="glass p-8 rounded-[2.5rem] border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full"></div>
                <div className="p-3 bg-primary text-white rounded-xl w-fit mb-6 shadow-glow relative z-10">
                   <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-5xl font-black mb-1 relative z-10 text-white">{analytics?.totals?.completed_or_launched || 0}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Launches</p>
                <p className="text-[9px] font-bold text-primary/60 mt-6 tracking-widest italic flex items-center gap-2">
                   <TrendingUp className="w-3 h-3" /> Momentum Verified
                </p>
             </div>
             
             <div className="md:col-span-2 glass p-8 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden border border-white/5">
                <div className="grid grid-cols-2 gap-10 w-full">
                   <div className="space-y-2">
                      <div className="flex items-center gap-3 mb-6">
                         <Star className="w-5 h-5 text-amber-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Personal Cred Score</span>
                      </div>
                      <h4 className="text-5xl font-black text-white">Tier-1</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/60 mt-4 leading-relaxed">Top 5% Resolution Velocity in current orbit</p>
                   </div>
                   <div className="flex items-center justify-end">
                      <div className="w-24 h-24 rounded-full border-4 border-amber-500/20 flex items-center justify-center group overflow-hidden relative">
                         <div className="absolute inset-0 bg-amber-500/5 animate-pulse"></div>
                         <Star className="w-10 h-10 text-amber-500 animate-float relative z-10" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="glass p-10 rounded-[3rem] border border-white/5">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted flex items-center gap-3 italic">
                      <PieChartIcon className="w-4 h-4 text-[#8b5cf6]" /> Project Saturation
                   </h3>
                </div>
                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                           data={projectChartData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {projectChartData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <ReTooltip 
                           contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900, color: '#fff' }}
                         />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className="glass p-10 rounded-[3rem] border border-white/5">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted flex items-center gap-3 italic">
                      <BarChart3 className="w-4 h-4 text-primary" /> Sector Velocity
                   </h3>
                </div>
                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stateChartData}>
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} hide />
                         <YAxis hide />
                         <ReTooltip 
                           cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                           contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900, color: '#fff' }}
                         />
                         <Bar dataKey="tasks" radius={[10, 10, 10, 10]} barSize={20}>
                           {stateChartData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
             {[
               { id: 'todays_task', label: "Today's Tasks", count: activeCount },
               { id: 'start_date', label: 'Start Date Tasks', count: startDateCount },
               { id: 'due_date', label: 'Due Date Tasks', count: dueTodayCount, color: 'text-amber-500' },
               { id: 'deadline', label: 'Deadline Tasks', count: overdueCount, color: 'text-error' },
               { id: 'completed', label: 'Completed Tasks', count: completedCount, color: 'text-emerald-500' },
               { id: 'all', label: 'All Tasks', count: tasks.length },
             ].map(opt => (
               <button 
                key={opt.id}
                onClick={() => setFilter(opt.id as typeof filter)}
                className={`flex items-center gap-4 whitespace-nowrap px-6 py-3 rounded-2xl transition-all border ${
                  filter === opt.id ? 'bg-primary border-primary text-white shadow-glow' : 'glass border-white/5 text-text-muted hover:border-primary/40'
                }`}
               >
                 <span className={`text-[10px] font-black uppercase tracking-widest ${opt.color && filter !== opt.id ? opt.color : ''}`}>{opt.label}</span>
                 <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${filter === opt.id ? 'bg-white/20 text-white' : 'bg-white/5 text-text-muted'}`}>
                   {opt.count}
                 </span>
               </button>
             ))}
          </div>

          <div className="space-y-4">
             <AnimatePresence mode="popLayout">
               {filteredTasks.length === 0 && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 glass rounded-[3rem] border-dashed border-white/10">
                    <ClipboardList className="w-12 h-12 text-text-muted/20 mx-auto mb-6" />
                    <p className="text-text-muted font-black text-xs uppercase tracking-widest italic opacity-40">No matching units in orbit.</p>
                 </motion.div>
               )}
               {filteredTasks.map((t, idx) => (
                 <motion.div 
                   key={t.id}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, scale: 0.98 }}
                   transition={{ delay: idx * 0.05 }}
                   onClick={() => setSelectedTaskId(t.id)}
                    className={`group p-6 glass rounded-[2rem] border flex items-center gap-6 cursor-pointer transition-all hover:bg-white/5 ${getTaskBorderColor(t)}`}
                 >
                    <div className={`p-4 rounded-2xl ${t.is_client_approved ? 'bg-emerald-500/10 text-emerald-500' : (['client-review', 'completed-launched'].includes(t.state_slug || '') ? 'bg-blue-500/10 text-blue-500' : (t.priority === 'urgent' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'))} group-hover:shadow-glow transition-all`}>
                       {PRIORITY_ICONS[t.priority] || <CircleDashed className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3 mb-2">
                          <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">{t.task_code} • {t.project__slug || 'GENERAL'} {t.module_slug && `• ${t.module_slug}`}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10"></span>
                          <span className={`px-2 py-0.5 rounded-md font-black tracking-widest text-[8px] uppercase ${
                             t.state_slug === 'pending' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                             t.state_slug === 'in-progress' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                             t.state_slug === 'team-head-review' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                             t.state_slug === 'client-review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' :
                             (t.state_slug === 're-edit' || t.state_slug === 'rework-revision') ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                             t.state_slug === 'completed-launched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                             'bg-surface/50 text-text-muted/60 border border-border/30'
                           }`}>{t.state__name || t.state_slug?.replace(/-/g, ' ')}</span>
                          {t.is_client_approved ? (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">🟢 Client Approved</span>
                          ) : ['client-review', 'completed-launched'].includes(t.state_slug || '') ? (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]">🔵 In-House Approved</span>
                          ) : t.state_slug === 'team-head-review' ? (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">🟡 Pending Review</span>
                          ) : t.state_slug === 'rework-revision' ? (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse">🔴 Rework / Re-Edit</span>
                          ) : null}
                       </div>
                       <h4 className="font-extrabold text-sm text-text-muted group-hover:text-white transition-colors uppercase tracking-tight truncate">{t.title}</h4>
                    </div>
                    <div className="flex items-center gap-8">
                       <div className="text-right hidden lg:block">
                          <p className={`text-[9px] uppercase font-black tracking-widest ${t.priority === 'urgent' ? 'text-error' : 'text-text-muted/40'}`}>
                            {t.priority}
                          </p>
                           <div className="flex flex-col items-end gap-1 mt-1.5 text-[9px] text-text-muted font-bold">
                              {me?.role !== 'specialist' && t.posting_date && <div className="flex items-center gap-1.5">📅 {t.posting_date}</div>}
                              <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {t.due_date || 'N/A'}</div>
                              {t.deadline && <div className="flex items-center gap-1.5 text-red-500 font-black"><AlertTriangle className="w-3 h-3" /> DEADLINE: {t.deadline}</div>}
                           </div>
                       </div>
                       <div className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center text-text-muted/20 group-hover:border-primary/40 group-hover:text-primary transition-all group-hover:translate-x-1">
                          <ChevronRight className="w-5 h-5" />
                       </div>
                    </div>
                 </motion.div>
               ))}
             </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
