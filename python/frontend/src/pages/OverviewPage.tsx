import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { AnalyticsSummary, Project, Activity } from '../api';
import { motion } from 'framer-motion';
import { TrendingUp, Briefcase, CircleDashed, Activity as ActivityIcon, Calendar, ArrowUpRight } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import TaskDetailModal from '../components/TaskDetailModal';

export default function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = useCallback(() => {
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
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full shadow-glow"
      />
    </div>
  );

  const chartData = analytics?.by_state?.map(s => ({
    name: s.state__name,
    count: s.c
  })) || [];

  const trendData = analytics?.historical_trend?.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    units: t.created
  })) || [];

  return (
    <div className="space-y-10 pb-24 font-inter">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#8b5cf6] to-[#d946ef]">
            Command Center
          </h1>
          <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60 italic">Real-time Analytics // Active Operations</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-5 py-3 glass rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">System Health: Optimal</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-2 glass rounded-[3rem] p-10 relative overflow-hidden group border border-primary/10"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
               <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
                 <TrendingUp className="w-6 h-6 text-white" />
               </div>
               <button onClick={() => onNavigate?.('kanban')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <ArrowUpRight className="w-5 h-5 text-white" />
               </button>
            </div>
            <div className="mt-8">
              <h3 className="text-7xl font-black tracking-tighter mb-4 text-white">{analytics?.totals?.completed_or_launched ?? 0}</h3>
              <p className="text-xl font-bold text-text">Tactical Units Launched</p>
              <p className="text-xs text-text-muted mt-4 opacity-70 leading-relaxed font-medium">Successfully deployed operations across all designated project sectors.</p>
            </div>
          </div>
        </motion.div>

        <div className="md:col-span-2 grid grid-cols-2 gap-6">
          <div className="glass rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-primary/30 transition-all group">
             <Briefcase className="w-8 h-8 text-primary/40 group-hover:text-primary transition-colors" />
             <div>
                <h4 className="text-4xl font-black tracking-tighter text-white">{analytics?.totals?.all ?? 0}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-2">Global Task Volume</p>
             </div>
          </div>
          <div className="glass rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-[#d946ef]/30 transition-all group">
             <Calendar className="w-8 h-8 text-[#d946ef]/40 group-hover:text-[#d946ef] transition-colors" />
             <div>
                <h4 className="text-4xl font-black tracking-tighter text-white">{projects.length}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-2">Active Orbits</p>
             </div>
          </div>
          <div className="col-span-2 glass rounded-[2.5rem] p-8 flex items-center justify-between border-dashed border-white/10">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center text-[#8b5cf6]">
                   <CircleDashed className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                   <h4 className="text-3xl font-black tracking-tighter text-white">{analytics?.totals?.pending ?? 0}</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Pending Deployment</p>
                </div>
             </div>
             <div className="text-right">
                <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-gradient-to-r from-primary to-[#d946ef]" style={{ width: '68%' }}></div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 italic">Resource Load Factor</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 glass rounded-[3rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-xs uppercase tracking-[0.3em] text-text-muted italic">Operational Flux Trend</h3>
            <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full">Last 30 Cycles</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900 }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="units" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUnits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-[3rem] p-10">
          <h3 className="font-black text-xs uppercase tracking-[0.3em] text-text-muted mb-10 italic">Stage Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8', width: 60 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900 }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 glass rounded-[3rem] p-10">
          <div className="flex items-center justify-between mb-10 px-2">
             <h3 className="font-black text-xs uppercase tracking-[0.3em] text-text-muted italic flex items-center gap-3">
                <ActivityIcon className="w-4 h-4 text-primary" /> Sector Activity Stream
             </h3>
             <button onClick={() => onNavigate?.('activity')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-primary/40 underline-offset-8">Analyze Full Log</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {recentActivity.map((a) => (
               <div key={a.id} className="p-5 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col gap-3 hover:bg-white/10 transition-all group cursor-pointer" onClick={() => a.payload && (a.payload as { id: number }).id && setSelectedTaskId((a.payload as { id: number }).id)}>
                  <div className="flex justify-between items-center">
                    <div className="p-2 bg-primary/10 rounded-xl"><ActivityIcon className="w-4 h-4 text-primary" /></div>
                    <span className="text-[9px] font-black text-text-muted/40 uppercase tracking-widest">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs font-bold truncate text-text-muted group-hover:text-text transition-colors capitalize">{a.action.replace(/_/g, ' ')}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">{a.project_name || 'Global Matrix'}</p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
