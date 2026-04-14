import { useEffect, useState } from 'react';
import { api } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CircleDashed, Clock, AlertTriangle, ArrowUp, Circle,
  ClipboardList, TrendingUp, Star, Zap, ChevronRight
} from 'lucide-react';
import TaskDetailModal from '../../components/TaskDetailModal';

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertTriangle className="w-4 h-4" />,
  high: <ArrowUp className="w-4 h-4" />,
  medium: <Circle className="w-4 h-4" />,
  low: <Circle className="w-4 h-4" />,
};

export default function MyTasksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [me, setMe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'due_today' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<'tasks' | 'performance'>('tasks');
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = () => {
    setIsLoading(true);
    const personalFilter = localStorage.getItem('access_token') ? { personal: 'true' } : {};
    Promise.all([
      api.getTasks(), 
      api.getMe(), 
      api.getAnalytics(personalFilter)
    ])
      .then(([t, m, a]) => {
        setMe(m.data);
        setAnalytics(a.data);
        const myTasks = t.data.filter((task: { assignee?: { id: number } }) => task.assignee?.id === m.data.id);
        setTasks(myTasks);
      })
      .catch(err => console.error("Error fetching my tasks:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    if (filter === 'urgent') return t.priority === 'urgent';
    if (filter === 'due_today') return t.due_date === todayStr;
    if (filter === 'overdue') return t.due_date && t.due_date < todayStr;
    return true;
  });

  const urgentCount = tasks.filter(t => t.priority === 'urgent').length;
  const dueTodayCount = tasks.filter(t => t.due_date === todayStr).length;
  const overdueCount = tasks.filter(t => t.due_date && t.due_date < todayStr).length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
        />
      )}

      {/* Decent Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Personal Workspace</h1>
          <p className="text-text-muted mt-2 font-medium flex items-center gap-2">
            Welcome back, {me?.first_name || 'Team Member'}
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span className="text-xs uppercase font-black tracking-widest text-primary/70">
               {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tasks' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text'}`}
          >
            Resolution List
          </button>
          <button 
            onClick={() => setActiveTab('performance')} 
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'performance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text'}`}
          >
            Velocity Insights
          </button>
        </div>
      </div>

      {activeTab === 'performance' ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bento-card p-8 bg-indigo-500/5 border-indigo-500/10">
                <div className="p-3 bg-indigo-500 text-white rounded-xl w-fit mb-6 shadow-lg shadow-indigo-500/20">
                   <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-4xl font-black mb-1">{analytics?.totals?.completed_or_launched || 0}</h4>
                <p className="text-sm font-bold text-indigo-500/80 uppercase tracking-widest">Items Launched</p>
                <p className="text-xs font-medium text-indigo-500/40 mt-4 leading-relaxed">Total lifetime contributions to the Colour Parrot ecosystem.</p>
             </div>
             <div className="bento-card p-8">
                <div className="p-3 bg-emerald-500 text-white rounded-xl w-fit mb-6 shadow-lg shadow-emerald-500/20">
                   <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="text-4xl font-black mb-1">94%</h4>
                <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Efficiency Rating</p>
                <p className="text-xs font-medium text-text-muted/60 mt-4 leading-relaxed">Based on resolution speed and code review quality protocols.</p>
             </div>
             <div className="bento-card p-8 bg-surface/50">
                <div className="p-3 bg-slate-800 text-white rounded-xl w-fit mb-6">
                   <Star className="w-5 h-5" />
                </div>
                <h4 className="text-4xl font-black mb-1">MVP</h4>
                <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Badge Tier</p>
                <div className="flex gap-1 mt-4">
                   {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-1 rounded-full bg-primary/20"></div>)}
                </div>
             </div>
          </div>
          
          <div className="bento-card p-8">
             <h3 className="text-lg font-bold mb-6">Project Allocation</h3>
             <div className="space-y-4">
               {analytics?.by_project?.map((p: any) => (
                 <div key={p.project__slug} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50">
                    <div className="flex items-center gap-4">
                       <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">{p.project__slug}</span>
                       <span className="font-bold text-sm">{p.project__name}</span>
                    </div>
                    <span className="text-sm font-black text-text-muted">{p.c} tasks</span>
                 </div>
               ))}
             </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Decent Filter Bar */}
          <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-none">
             {[
               { id: 'all', label: 'All Items', count: tasks.length },
               { id: 'urgent', label: 'Critical Path', count: urgentCount, color: 'text-error' },
               { id: 'due_today', label: 'Due Today', count: dueTodayCount, color: 'text-indigo-500' },
               { id: 'overdue', label: 'Overdue', count: overdueCount, color: 'text-amber-500' },
             ].map(opt => (
               <button 
                key={opt.id}
                onClick={() => setFilter(opt.id as any)}
                className={`flex items-center gap-3 whitespace-nowrap px-4 py-2 rounded-xl transition-all border ${
                  filter === opt.id ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-surface border-border text-text-muted hover:border-indigo-500/50'
                }`}
               >
                 <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
                 <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${filter === opt.id ? 'bg-white/20 text-white' : 'bg-background text-text-muted'}`}>
                   {opt.count}
                 </span>
               </button>
             ))}
          </div>

          {/* Staggered Task List */}
          <div className="space-y-3">
             <AnimatePresence mode="popLayout">
               {filteredTasks.length === 0 && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
                    <ClipboardList className="w-10 h-10 text-text-muted/20 mx-auto mb-4" />
                    <p className="text-text-muted font-medium">No tasks found matching this filter.</p>
                 </motion.div>
               )}
               {filteredTasks.map((t, idx) => (
                 <motion.div 
                   key={t.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ delay: idx * 0.03 }}
                   onClick={() => setSelectedTaskId(t.id)}
                   className="group p-5 bg-surface border border-border rounded-2xl flex items-center gap-6 cursor-pointer hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                 >
                    <div className={`p-3 rounded-xl bg-background text-text-muted group-hover:text-indigo-500 group-hover:bg-indigo-500/5 transition-colors`}>
                       {PRIORITY_ICONS[t.priority] || <CircleDashed className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">{t.project__slug || 'GENERAL'}</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span className="text-[10px] font-bold text-text-muted uppercase">{t.state__name}</span>
                       </div>
                       <h4 className="font-bold text-sm text-text truncate group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{t.title}</h4>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right hidden sm:block">
                          <p className={`text-[10px] uppercase font-black ${t.priority === 'urgent' ? 'text-error' : 'text-text-muted'}`}>
                            {t.priority} Priority
                          </p>
                          <div className="flex items-center justify-end gap-1.5 mt-1 text-xs text-text-muted font-medium">
                             <Clock className="w-3.5 h-3.5" />
                             {t.due_date || 'No Deadline'}
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-muted group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all">
                          <ChevronRight className="w-4 h-4" />
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
