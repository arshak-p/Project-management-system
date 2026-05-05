import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import type { User, Task, AnalyticsSummary } from '../api';
import { motion } from 'framer-motion';
import { 
  Users, Search, Target, TrendingUp, 
  ExternalLink, Briefcase,
  ChevronRight, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import TaskDetailModal from '../components/TaskDetailModal';

const COLORS = ['#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

export default function TeamIntelligencePage({ me }: { me: User | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberAnalytics, setMemberAnalytics] = useState<AnalyticsSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    api.getUsers().then(r => {
      setUsers(r.data);
      setIsLoading(false);
    });
  }, []);

  const getRangeParams = useCallback(() => {
    if (customRange.start && customRange.end) {
      return { start: customRange.start, end: customRange.end };
    }
    const now = new Date();
    let start = '';
    const end = now.toISOString().split('T')[0];

    if (dateRange === 'daily') {
      start = end;
    } else if (dateRange === 'weekly') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = lastWeek.toISOString().split('T')[0];
    } else if (dateRange === 'monthly') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      start = lastMonth.toISOString().split('T')[0];
    } else if (dateRange === 'all') {
      start = '';
    }

    return { start, end };
  }, [dateRange, customRange]);

  const loadMemberDetails = useCallback(async (userId: number) => {
    setIsDetailLoading(true);
    const range = getRangeParams();
    try {
      const [t, a] = await Promise.all([
        api.getTasks({ assignee: userId, start_date: range.start, end_date: range.end }),
        api.getAnalytics({ assignee: userId, start_date: range.start, end_date: range.end })
      ]);
      setMemberTasks(t.data);
      setMemberAnalytics(a.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  }, [getRangeParams]);

  useEffect(() => {
    if (selectedUserId) loadMemberDetails(selectedUserId);
  }, [selectedUserId, loadMemberDetails, dateRange]);

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const projectData = useMemo(() => {
    return (memberAnalytics?.by_project as { project__name: string, c: number }[])?.map((p) => ({
      name: p.project__name,
      value: p.c
    })) || [];
  }, [memberAnalytics]);

  const trendData = useMemo(() => {
    return memberAnalytics?.historical_trend?.map(t => ({
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activity: t.activity,
      velocity: t.velocity
    })) || [];
  }, [memberAnalytics]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20 font-inter max-w-7xl mx-auto">
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} me={me} />}
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Team Intelligence</h1>
          <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60 italic">Operator Review // Tactical Performance Deep-Dive</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 p-1 glass rounded-2xl border border-white/5">
              {(['daily', 'weekly', 'monthly', 'all'] as const).map(r => (
                <button 
                  key={r}
                  onClick={() => { setDateRange(r); setCustomRange({ start: '', end: '' }); }}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dateRange === r && !customRange.start ? 'bg-primary text-white shadow-glow' : 'text-text-muted hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
           </div>

           <div className="flex flex-col sm:flex-row items-center gap-2 p-2 sm:p-1 glass rounded-2xl border border-white/5 w-full sm:w-auto">
              <input 
                type="date" 
                value={customRange.start}
                onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                className="bg-transparent text-[9px] font-black uppercase tracking-widest text-text px-2 py-1 outline-none border-b sm:border-b-0 sm:border-r border-white/5 w-full sm:w-auto" 
              />
              <input 
                type="date" 
                value={customRange.end}
                onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                className="bg-transparent text-[9px] font-black uppercase tracking-widest text-text px-2 py-1 outline-none w-full sm:w-auto" 
              />
              {(customRange.start || customRange.end) && (
                <button onClick={() => setCustomRange({ start: '', end: '' })} className="p-1.5 hover:bg-white/5 rounded-lg">
                  <X className="w-3 h-3 text-text-muted" />
                </button>
              )}
           </div>

           <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/40" />
              <input
                type="text"
                placeholder="Find Member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass border border-white/5 rounded-2xl outline-none focus:border-primary transition-all text-[10px] font-black uppercase tracking-widest text-text"
              />
           </div>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
           {/* Sidebar: Member List */}
           <div className="md:col-span-4 lg:col-span-3 space-y-4 max-h-[40vh] md:max-h-[75vh] overflow-y-auto custom-scrollbar pr-2 order-2 md:order-1">
            {['admin', 'project_manager', 'hr', 'team_head', 'specialist', 'sales_manager'].map(role => {
              const roleUsers = filteredUsers.filter(u => u.role === role);
              if (roleUsers.length === 0) return null;
              
              return (
                <div key={role} className="space-y-2 mb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 mb-3 block">
                    {role.replace('_', ' ')} Tiers ({roleUsers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                    {roleUsers.map(user => (
                      <button 
                        key={user.id} 
                        onClick={() => setSelectedUserId(user.id)}
                        className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all group ${
                          selectedUserId === user.id ? 'bg-primary border-primary shadow-glow text-white' : 'glass border-white/5 text-text-muted hover:border-primary/40'
                        }`}
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${selectedUserId === user.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                            {user.first_name?.[0] || '?' }
                         </div>
                         <div className="text-left flex-1 min-w-0">
                            <p className="font-extrabold text-xs truncate capitalize">{user.first_name || 'Generic Operator'} {user.last_name}</p>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${selectedUserId === user.id ? 'text-white/60' : 'text-text-muted/40'}`}>{user.role || 'Member'}</p>
                         </div>
                         <ChevronRight className={`w-4 h-4 transition-transform ${selectedUserId === user.id ? 'translate-x-1' : 'opacity-0'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-10 glass rounded-3xl border-dashed border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 italic">No Operators in Sector</p>
              </div>
            )}
        </div>

        {/* Main Detail Area */}
        <div className="md:col-span-8 lg:col-span-9 order-1 md:order-2">
           {!selectedUserId ? (
             <div className="h-full min-h-[50vh] flex flex-col items-center justify-center glass rounded-[3rem] border-dashed border-white/10 p-10 text-center">
                <Users className="w-16 h-16 text-text-muted/10 mb-6" />
                <h3 className="text-xl font-black text-text-muted uppercase tracking-widest">Awaiting Operator Selection</h3>
                <p className="text-xs text-text-muted/40 mt-2 font-bold max-w-xs leading-relaxed uppercase tracking-tighter italic">Select an active member from the left matrix to initialize performance analytics and tactical overview.</p>
             </div>
           ) : isDetailLoading ? (
             <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
             </div>
           ) : (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
             >
                <div className="glass p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] -mr-40 -mt-40"></div>
                   <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center text-4xl font-black text-white shadow-glow">
                         {selectedUser?.first_name?.[0]}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                         <h2 className="text-4xl font-black tracking-tighter text-white capitalize">{selectedUser?.first_name} {selectedUser?.last_name}</h2>
                         <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-3">
                            <span className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-primary">{selectedUser?.role}</span>
                            <span className="text-[10px] font-bold text-text-muted italic">{selectedUser?.email}</span>
                         </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-4">
                         <div className="flex flex-col items-center glass p-6 rounded-3xl border-primary/20">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Efficiency</span>
                            <span className="text-4xl font-black text-white">{memberAnalytics?.totals?.efficiency !== undefined ? `${memberAnalytics.totals.efficiency}%` : 'N/A'}</span>
                         </div>
                         <div className="flex flex-col items-center glass p-6 rounded-3xl border-primary/20">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Workload</span>
                            <span className="text-4xl font-black text-white">
                               {memberAnalytics?.totals?.all ? Math.round((memberAnalytics.totals.pending / memberAnalytics.totals.all) * 100) : 0}%
                            </span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass p-8 rounded-[2.5rem]">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-10 flex items-center gap-3 italic">
                         <TrendingUp className="w-4 h-4 text-primary" /> Sector Velocity Trend
                      </h3>
                      <div className="h-[200px] w-full flex items-center justify-center">
                         {trendData.length > 0 && trendData.some(d => d.activity > 0 || d.velocity > 0) ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={trendData}>
                                 <defs>
                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <XAxis dataKey="date" hide />
                                 <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900, color: '#fff' }}
                                 />
                                 <Area type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" name="Active Engagement" />
                                 <Area type="monotone" dataKey="velocity" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVelocity)" name="Mission Success" />
                              </AreaChart>
                           </ResponsiveContainer>
                         ) : (
                           <div className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-30 italic">Awaiting Sector Movement...</div>
                         )}
                       </div>
                   </div>

                   <div className="glass p-8 rounded-[2.5rem]">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-10 flex items-center gap-3 italic">
                         <Briefcase className="w-4 h-4 text-[#8b5cf6]" /> Project Saturation
                      </h3>
                      <div className="h-[200px] w-full flex items-center justify-center">
                         {projectData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={projectData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                    {projectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: 900, color: '#fff' }} />
                              </PieChart>
                           </ResponsiveContainer>
                         ) : (
                           <div className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-30 italic">Sector Saturation Zero</div>
                         )}
                       </div>
                   </div>
                </div>

                <div className="glass rounded-[3rem] overflow-hidden border border-white/5">
                   <div className="px-8 py-6 bg-white/2 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted italic flex items-center gap-3">
                         <Target className="w-4 h-4 text-primary" /> Recent Mission Parameters
                      </h3>
                      <span className="text-[10px] font-black text-text-muted bg-white/5 px-4 py-1.5 rounded-full">{memberTasks.length} Operations Total</span>
                   </div>
                   <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {memberTasks.length > 0 ? memberTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={() => setSelectedTaskId(task.id)}
                          className="p-4 bg-background border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group"
                        >
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                 <span className="text-[8px] font-black uppercase tracking-widest text-primary">{task.task_code}</span>
                                 <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                 <span className="text-[8px] font-black text-text-muted uppercase italic tracking-tighter">{task.state__name}</span>
                              </div>
                              <h4 className="text-xs font-bold text-text-muted group-hover:text-white transition-colors truncate">{task.title}</h4>
                           </div>
                           <div className="flex items-center gap-6">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                task.priority === 'urgent' ? 'bg-error/10 text-error' : 'bg-white/5 text-text-muted'
                              }`}>{task.priority}</span>
                              <ExternalLink className="w-4 h-4 text-text-muted/20 group-hover:text-primary transition-all" />
                           </div>
                        </div>
                      )) : (
                        <div className="p-10 text-center">
                           <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40 italic">Awaiting Mission Parameters...</p>
                        </div>
                      )}
                   </div>
                </div>
             </motion.div>
           )}
        </div>
      </div>
    </div>
  );
}
