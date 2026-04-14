import { useEffect, useState } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Briefcase, CheckCircle2, CircleDashed, Clock, AlertCircle, Calendar, CalendarDays, Activity } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analytics, setAnalytics] = useState<any>(null);
  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.getAnalytics(), 
      api.getProjects(), 
      api.getActivity()
    ])
      .then(([a, p, act]) => {
        setAnalytics(a.data);
        setProjects(p.data);
        setRecentActivity(act.data.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

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
    <div className="space-y-10 pb-24">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#8b5cf6] to-[#d946ef]">
            Agency Overview
          </h1>
          <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60">System Status // Online</p>
        </div>
      </motion.div>

      {/* Ultra-Premium Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[450px]">
        {/* Main Resolution Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -5 }}
          onClick={() => onNavigate && onNavigate('kanban')}
          className="md:col-span-2 md:row-span-2 glass rounded-[3rem] p-10 border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent flex flex-col justify-between group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/30 transition-all duration-700"></div>
          <div>
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-10 shadow-glow animate-float">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-6xl font-black tracking-tighter mb-4">{analytics?.totals?.completed_or_launched ?? 0}</h3>
            <p className="text-xl font-bold text-text">Tasks Completed</p>
            <p className="text-sm text-text-muted mt-4 leading-relaxed max-w-sm">Completed tasks and resolved tickets across all active projects and departments.</p>
          </div>
          <div className="bg-white/5 py-2 px-6 rounded-full w-fit border border-white/10 text-[10px] uppercase font-black tracking-[3px]">
             Efficiency Core // Active
          </div>
        </motion.div>

        {/* Total Volume */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onNavigate && onNavigate('tasks')}
          className="md:col-span-1 md:row-span-1 glass rounded-[2.5rem] p-8 group cursor-pointer hover:border-primary/50 transition-all flex flex-col justify-between"
        >
          <Briefcase className="w-8 h-8 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
          <div>
             <h4 className="text-3xl font-black tracking-tighter">{analytics?.totals?.all ?? 0}</h4>
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Workspace Volume</p>
          </div>
        </motion.div>

        {/* Projects */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate && onNavigate('projects')}
          className="md:col-span-1 md:row-span-1 glass rounded-[2.5rem] p-8 group cursor-pointer hover:border-[#d946ef]/50 transition-all flex flex-col justify-between"
        >
          <Calendar className="w-8 h-8 text-[#d946ef] opacity-40 group-hover:opacity-100 transition-opacity" />
          <div>
             <h4 className="text-3xl font-black tracking-tighter">{projects.length}</h4>
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Active Projects</p>
          </div>
        </motion.div>

        {/* Pipeline Pipeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => onNavigate && onNavigate('kanban')}
          className="md:col-span-2 md:row-span-1 glass rounded-[2.5rem] p-8 flex items-center justify-between group cursor-pointer hover:border-[#8b5cf6]/50 transition-all"
        >
           <div className="flex items-center gap-8">
             <div className="w-16 h-16 bg-[#8b5cf6]/10 rounded-3xl flex items-center justify-center text-[#8b5cf6] group-hover:rotate-12 transition-transform">
                <CircleDashed className="w-8 h-8" />
             </div>
             <div>
                <h4 className="text-4xl font-black tracking-tighter">{analytics?.totals?.pending ?? 0}</h4>
                <p className="text-sm font-bold text-text-muted">Pending Tasks</p>
             </div>
           </div>
           <div className="text-right">
             <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#8b5cf6] w-2/3"></div>
             </div>
             <p className="text-[10px] font-black uppercase text-[#8b5cf6]/60">System Load</p>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stage Log */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 glass rounded-[3rem] p-10"
        >
          <h3 className="font-extrabold text-xl mb-10 tracking-tight">Stage Distribution</h3>
          <div className="space-y-6">
             {analytics?.by_state?.map((s: any, i: number) => (
               <div key={s.state__slug} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#d946ef'][i % 3] }}></div>
                     <span className="text-sm font-bold text-text-muted uppercase tracking-tight">{s.state__name}</span>
                  </div>
                  <span className="font-black text-white">{s.c}</span>
               </div>
             ))}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 glass rounded-[3rem] p-10"
        >
          <div className="flex items-center justify-between mb-10">
             <h3 className="font-extrabold text-xl tracking-tight">Recent Activity</h3>
             <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {recentActivity.map((a: any) => (
               <div key={a.id} className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                  <div className="p-3 bg-background rounded-2xl"><Activity className="w-4 h-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">Log Update</p>
                     <p className="text-sm font-bold truncate text-text-muted">{a.action}</p>
                  </div>
               </div>
             ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
