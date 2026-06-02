import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { TrendingUp, Briefcase, CircleDashed, Activity as ActivityIcon, Calendar, ArrowUpRight, Cake, PartyPopper } from 'lucide-react';
import type { AnalyticsSummary, Project, Activity, User } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import TaskDetailModal from '../components/TaskDetailModal';

export default function OverviewPage({ onNavigate, me }: { onNavigate?: (page: string) => void, me: User | null }) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const activeRequestRef = useRef<number>(0);

  const load = useCallback(() => {
    const requestId = ++activeRequestRef.current;
    const params: any = {};
    if (viewMode === 'month') {
      const now = new Date();
      params.start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    return Promise.all([
      api.getAnalytics(params),
      api.getProjects(),
      api.getActivity()
    ])
      .then(([a, p, act]) => {
        if (requestId !== activeRequestRef.current) return;
        setAnalytics(a.data);
        setProjects(p.data);
        const activityCount = viewMode === 'all' ? 20 : 10;
        setRecentActivity(act.data.slice(0, activityCount));
      })
      .catch(err => {
        if (requestId === activeRequestRef.current) console.error(err);
      })
      .finally(() => {
        if (requestId === activeRequestRef.current) setIsLoading(false);
      });
  }, [viewMode]);

  useEffect(() => {
    let timeoutId: number;
    let isMounted = true;

    const poll = () => {
      if (!isMounted) return;
      load().finally(() => {
        if (isMounted) {
          timeoutId = setTimeout(poll, 3000);
        }
      });
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [load]);

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
    units: (t.activity || 0) + (t.velocity || 0)
  })) || [];

  return (
    <div className="space-y-10 pb-24 font-inter">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="px-1 md:px-0">
          <h1 className="text-2xl lg:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#8b5cf6] to-[#d946ef]">
            Command Center
          </h1>
          <p className="text-[8px] lg:text-[10px] text-text-muted mt-2 font-bold tracking-widest uppercase opacity-60 italic">Real-time Analytics // Active Operations</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Filter Toggle */}
          <div className="glass p-1 rounded-2xl border border-white/5 flex items-center shadow-inner scale-90 md:scale-100">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'month'
                  ? 'bg-primary text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'all'
                  ? 'bg-primary text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
            >
              All
            </button>
          </div>

          <div className="px-4 lg:px-5 py-2.5 lg:py-3 glass rounded-xl lg:rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-white">System Optimal</span>
          </div>
        </div>
      </div>

      {(() => {
        const today = new Date();
        const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isBday = me?.date_of_birth && me.date_of_birth.substring(5, 10) === monthDay;

        if (!isBday) return null;

        return (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative overflow-hidden group mb-10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#d946ef] opacity-20 blur-3xl group-hover:opacity-30 transition-opacity"></div>
            <div className="relative glass border-[#ec4899]/30 rounded-[2.5rem] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8 shadow-2xl">
              <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2rem] bg-gradient-to-br from-[#ec4899] to-[#d946ef] flex items-center justify-center shadow-glow-lg animate-bounce-slow relative">
                <Cake className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <PartyPopper className="w-4 h-4 text-[#ec4899]" />
                </div>
              </div>
              <div className="text-center lg:text-left flex-1">
                <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-white mb-2">Happy Birthday, {me?.first_name || 'Legend'}! 🎂</h2>
                <p className="text-sm lg:text-base text-text-muted font-bold max-w-2xl opacity-80">
                  Today the Command Center celebrates you. Thank you for your incredible contribution to the Colour Parrot team. Have an amazing day filled with joy and success!
                </p>
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-4 glass border-white/10 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ec4899]">Agency Status</span>
                  <span className="text-lg font-black text-white">Guest of Honor</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -5 }}
          onClick={() => onNavigate?.('kanban')}
          className="md:col-span-2 glass rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 relative overflow-hidden group border border-primary/10 flex flex-col md:flex-row gap-6 lg:gap-10 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 opacity-20"></div>

          <div className="flex-1 relative z-10">
            <div className="flex justify-between items-start mb-6 lg:mb-10">
              <div className="p-4 lg:p-5 bg-primary/20 rounded-2xl lg:rounded-[2rem] shadow-glow">
                <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
              </div>
              <div className="p-3 glass rounded-full opacity-40 group-hover:opacity-100 transition-all">
                <ArrowUpRight className="w-5 h-5 text-text" />
              </div>
            </div>

            <div className="space-y-2">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl lg:text-8xl font-black tracking-tighter text-text block"
              >
                {analytics?.totals?.completed_or_launched || 0}
              </motion.span>
              <h3 className="text-lg lg:text-2xl font-black text-text-muted uppercase tracking-tighter">Units Launched</h3>
              <p className="text-[10px] lg:text-xs text-text-muted/60 mt-4 leading-relaxed max-w-xs">
                Successfully deployed operations across project sectors.
              </p>
            </div>
          </div>

          <div className="w-full md:w-64 flex flex-col gap-4 relative z-10">
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden bento-item cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate?.('tasks'); }}>
              <div className="flex justify-between items-center mb-6">
                <div className="p-3 bg-indigo-500/10 rounded-2xl"><Briefcase className="w-6 h-6 text-indigo-400" /></div>
              </div>
              <div>
                <span className="text-4xl font-black text-text block">{analytics?.totals?.all || 0}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60">Global Task Volume</span>
              </div>
            </div>

            <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden bento-item cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate?.('projects'); }}>
              <div className="flex justify-between items-center mb-6">
                <div className="p-3 bg-fuchsia-500/10 rounded-2xl"><Calendar className="w-6 h-6 text-fuchsia-400" /></div>
              </div>
              <div>
                <span className="text-4xl font-black text-text block">{projects.length}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60">Active Projects</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col justify-center relative overflow-hidden bento-item cursor-pointer" onClick={() => onNavigate?.('tasks')}>
          <div className="flex flex-col gap-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <CircleDashed className="w-8 h-8 text-amber-400 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-text">{analytics?.totals?.pending || 0}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60">Pending</span>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[#d946ef] shadow-glow"
                  style={{ width: `${Math.min(100, (analytics?.totals?.pending || 0) / (analytics?.totals?.all || 1) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-4">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] italic opacity-40">Resource Load Factor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        <div className="lg:col-span-3 glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-muted italic">Operational Flux</h3>
            <span className="text-[8px] md:text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full">Trend</span>
          </div>
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-muted)' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '1rem',
                    border: '1px solid var(--border)',
                    fontSize: '10px',
                    fontWeight: 900,
                    color: 'var(--text)'
                  }}
                  itemStyle={{ color: 'var(--primary)' }}
                  labelStyle={{ color: 'var(--text)', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="units" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUnits)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
          <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-muted mb-8 md:mb-10 italic">Stage Distribution</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--text-muted)', width: 60 }}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '1rem',
                    border: '1px solid var(--border)',
                    fontSize: '10px',
                    fontWeight: 900,
                    color: 'var(--text)'
                  }}
                  itemStyle={{ color: 'inherit' }}
                  labelStyle={{ color: 'var(--text)', marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20} isAnimationActive={false}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
          <div className="flex items-center justify-between mb-8 md:mb-10 px-1 md:px-2">
            <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-muted italic flex items-center gap-2 md:gap-3">
              <ActivityIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" /> Sector Activity Stream
            </h3>
            <button onClick={() => onNavigate?.('activity')} className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-primary/40 underline-offset-8">Analyze Full Log</button>
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
