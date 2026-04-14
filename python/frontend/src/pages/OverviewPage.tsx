import { useEffect, useState } from 'react';
import { api } from '../api';
import { TrendingUp, Briefcase, CheckCircle2, CircleDashed, Clock, AlertCircle } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analytics, setAnalytics] = useState<any>(null);
  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getProjects(), api.getActivity()])
      .then(([a, p, act]) => {
        setAnalytics(a.data);
        setProjects(p.data);
        setRecentActivity(act.data.slice(0, 8));
      })
      .catch((err) => {
        console.error('Fetching issue on Overview:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm">Loading analytics...</p>
      </div>
    </div>
  );

  const stats = [
    { label: 'Total Tasks', value: analytics?.totals?.all ?? 0, icon: <Briefcase />, color: 'primary', sub: 'All work items', nav: 'tasks' },
    { label: 'Pending', value: analytics?.totals?.pending ?? 0, icon: <CircleDashed />, color: '[#8b5cf6]', sub: 'In progress', nav: 'kanban' },
    { label: 'Completed', value: analytics?.totals?.completed_or_launched ?? 0, icon: <CheckCircle2 />, color: 'green-500', sub: 'Launched / approved', nav: 'kanban' },
    { label: 'Active Projects', value: projects.length, icon: <TrendingUp />, color: 'orange-400', sub: 'Client engagements', nav: 'projects' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-text-muted mt-1">Real-time overview of all projects and tasks.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} onClick={() => onNavigate && onNavigate(s.nav)} className={`glass p-5 rounded-2xl border border-border/50 hover:border-${s.color}/30 group transition-all cursor-pointer`}>
            <div className={`p-3 bg-${s.color}/10 text-${s.color} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
            <h3 className="text-3xl font-black mb-0.5">{s.value}</h3>
            <p className="text-sm font-semibold text-text">{s.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Productivity Trend Line Graph */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-surface/30 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Productivity Trend</h2>
            <p className="text-text-muted text-sm">Tasks created vs. completed over the last 30 days.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-primary rounded-sm"></div> Created</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Completed</div>
          </div>
        </div>
        <div className="p-6 h-72 w-full relative">
          {analytics?.historical_trend?.length > 0 ? (
            <svg viewBox="0 0 1000 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradientCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              {[0, 50, 100, 150, 200].map(y => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="currentColor" strokeWidth="0.5" className="text-border/20" />
              ))}
              
              {(() => {
                const data = analytics.historical_trend;
                const maxVal = Math.max(...data.map((d: any) => Math.max(d.created, d.completed, 1)));
                const scaleY = (val: number) => 180 - (val / (maxVal * 1.5)) * 180;
                const scaleX = (idx: number) => (idx / (data.length - 1)) * 1000;

                const createPoints = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.created)}`).join(' L ');
                const completePoints = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.completed)}`).join(' L ');
                
                return (
                  <>
                    {/* Area Fills */}
                    <path d={`M 0,180 L ${createPoints} L 1000,180 Z`} fill="url(#gradientCreated)" className="transition-all duration-1000" />
                    <path d={`M 0,180 L ${completePoints} L 1000,180 Z`} fill="url(#gradientCompleted)" className="transition-all duration-1000" />
                    
                    {/* Lines */}
                    <path d={`M ${createPoints}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                    <path d={`M ${completePoints}`} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                    
                    {/* Dates */}
                    {data.map((d: any, i: number) => i % 6 === 0 ? (
                      <g key={i}>
                        <text x={scaleX(i)} y="200" textAnchor="middle" className="text-[10px] fill-text-muted font-bold">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
                      </g>
                    ) : null)}
                  </>
                );
              })()}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted text-sm italic">Crunching trend data...</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by State & Graphical View */}
        <div className="glass rounded-2xl border border-border overflow-hidden lg:col-span-1">
          <div className="p-5 border-b border-border/50 bg-surface/30">
            <h2 className="font-bold text-lg">Work Status Distribution</h2>
            <p className="text-text-muted text-sm">Visual breakdown of your current pipeline.</p>
          </div>
          <div className="p-8 flex flex-col items-center justify-center">
            {analytics?.by_state?.length > 0 ? (
              <div className="relative w-48 h-48 mb-8">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-surface" />
                  {(() => {
                    let cumulativePct = 0;
                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
                    return analytics.by_state.map((s: any, i: number) => {
                      const pct = analytics.totals.all > 0 ? (s.c / analytics.totals.all) * 100 : 0;
                      const dashArray = `${pct} ${100 - pct}`;
                      const dashOffset = -cumulativePct;
                      cumulativePct += pct;
                      return (
                        <circle
                          key={s.state__slug}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={colors[i % colors.length]}
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * pct) / 100 + (251.2 * -dashOffset) / 100}
                          className="transition-all duration-1000 ease-out"
                          style={{ strokeDashoffset: 251.2 - (251.2 * pct) / 100, transform: `rotate(${(dashOffset / 100) * 360}deg)`, transformOrigin: 'center' }}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{analytics.totals.all}</span>
                  <span className="text-[10px] uppercase font-bold text-text-muted">Tasks</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-text-muted text-sm italic">No chart data</div>
            )}
            
            <div className="w-full space-y-3">
              {analytics?.by_state?.map((s: any, i: number) => {
                const pct = analytics.totals.all > 0 ? Math.round((s.c / analytics.totals.all) * 100) : 0;
                const colors = ['bg-[#3b82f6]', 'bg-[#8b5cf6]', 'bg-[#ec4899]', 'bg-[#f59e0b]', 'bg-[#10b981]', 'bg-[#6366f1]'];
                return (
                  <div key={s.state__slug} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`}></div>
                      <span className="font-medium text-text-muted">{s.state__name}</span>
                    </div>
                    <span className="font-bold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tasks by Project */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border/50 bg-surface/30">
            <h2 className="font-bold text-lg">Tasks by Project</h2>
            <p className="text-text-muted text-sm">Which clients have the most active tasks.</p>
          </div>
          <div className="p-5 space-y-3">
            {analytics?.by_project?.length === 0 && <p className="text-text-muted text-sm text-center py-4">No data yet.</p>}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {analytics?.by_project?.map((p: any, i: number) => (
              <div 
                key={p.project__slug} 
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface/40 transition-colors cursor-pointer"
                onClick={() => {
                  localStorage.setItem('jump_project_filter', p.project_id.toString());
                  if (onNavigate) onNavigate('tasks');
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6] flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.project__name}</p>
                  <p className="text-xs text-text-muted font-mono">{p.project__slug}</p>
                </div>
                <span className="text-lg font-bold text-primary">{p.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-surface/30">
          <h2 className="font-bold text-lg">Recent Activity Log</h2>
        </div>
        <div className="divide-y divide-border/30">
          {recentActivity.length === 0 && <p className="p-6 text-text-muted text-sm text-center">No recent activity.</p>}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {recentActivity.map((a: any) => (
            <div 
              key={a.id} 
              onClick={() => { if (a.entity_type === 'work_item') setSelectedTaskId(Number(a.entity_id)) }}
              className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${a.entity_type === 'work_item' ? 'hover:bg-surface/30 cursor-pointer' : ''}`}
            >
              <div className="p-2 bg-surface rounded-lg">
                <AlertCircle className="w-4 h-4 text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  <span className="text-primary">{a.entity_type} #{a.entity_id}</span> — {a.action}
                </p>
                <p className="text-xs text-text-muted">{a.user ? `by User #${a.user}` : 'System'}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
