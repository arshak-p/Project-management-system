import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Task, Project, TimeLog, User } from '../api';
import { Clock, Clock3, Download } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function TimesheetsPage({ me }: { me: User | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allLogs, setAllLogs] = useState<TimeLog[]>([]);

  const load = useCallback(() => {
    Promise.all([api.getTasks(), api.getProjects(), api.getAllTimeLogs()])
      .then(([t, p, l]) => {
        setTasks(t.data);
        setProjects(p.data);
        setAllLogs(l.data);
      })
      .catch(err => console.error("Error fetching logs:", err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const filteredLogs = allLogs.filter(log => {
    let match = true;
    const logDateStr = (log.logged_at || log.created_at).split('T')[0];
    
    if (startDate && logDateStr < startDate) match = false;
    if (endDate && logDateStr > endDate) match = false;
    
    if (selectedUser !== 'all' && log.user?.id?.toString() !== selectedUser) {
      match = false;
    }
    const taskObj = tasks.find(t => t.id === log.work_item);
    if (selectedProject !== 'all' && taskObj?.project?.toString() !== selectedProject) {
      match = false;
    }
    return match;
  });

  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ["Date", "Team Member", "Project", "Task", "Note", "Duration (mins)"];
    
    const rows = filteredLogs.map(log => {
      const taskObj = tasks.find(t => t.id === log.work_item);
      return [
        log.logged_at || log.created_at.split('T')[0],
        log.user?.first_name || 'System',
        projects.find(p => p.id === taskObj?.project)?.name || 'General',
        taskObj?.title || 'Unknown Task',
        `"${log.note.replace(/"/g, '""')}"`,
        log.minutes
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `colour_parrot_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMinutes = filteredLogs.reduce((acc, log) => acc + log.minutes, 0);

  const userAgg: Record<number, { name: string, minutes: number, id: number }> = {};
  filteredLogs.forEach(log => {
    const uid = log.user?.id || 0;
    if (!userAgg[uid]) userAgg[uid] = { name: log.user?.first_name || log.user?.email || 'Unknown', minutes: 0, id: uid };
    userAgg[uid].minutes += log.minutes;
  });

  const allUsersMap = new Map();
  allLogs.forEach(l => {
    if (l.user) allUsersMap.set(l.user.id, l.user.first_name || l.user.email);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
          me={me}
        />
      )}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter flex items-center gap-3">
            <Clock3 className="text-primary w-8 h-8 lg:w-10 lg:h-10" />
            Reporting
          </h1>
          <p className="text-text-muted mt-1 text-sm">Download professional activity reports for clients or payroll.</p>
        </div>

        <button 
          onClick={handleDownloadCSV}
          disabled={filteredLogs.length === 0}
          className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
        >
          <Download className="w-5 h-5" />
          Export Report (CSV)
        </button>
      </div>

      <div className="flex flex-col gap-4 glass p-4 lg:p-6 rounded-2xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:flex items-end gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-black tracking-widest text-text-muted px-1 mb-1">Team Member</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-3 outline-none focus:border-primary min-w-[180px]">
              <option value="all">Every Specialist</option>
              {Array.from(allUsersMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-black tracking-widest text-text-muted px-1 mb-1">Project / Client</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-3 outline-none focus:border-primary min-w-[180px]">
              <option value="all">All Clients</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-black tracking-widest text-text-muted px-1 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-3 outline-none focus:border-primary" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-black tracking-widest text-text-muted px-1 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-3 outline-none focus:border-primary" style={{ colorScheme: 'dark' }} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: 'Today', onClick: () => { const today = new Date().toISOString().split('T')[0]; setStartDate(today); setEndDate(today); } },
            { label: 'Last 7 Days', onClick: () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 7); setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); } },
            { label: 'This Month', onClick: () => { const end = new Date(); const start = new Date(); start.setDate(1); setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0]); } },
            { label: 'Clear All', onClick: () => { setStartDate(''); setEndDate(''); setSelectedUser('all'); setSelectedProject('all'); }, secondary: true }
          ].map(btn => (
            <button 
              key={btn.label}
              onClick={btn.onClick}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${btn.secondary ? 'text-text-muted hover:text-text' : 'glass border border-border hover:border-primary/50'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[2rem] border border-border/80 flex flex-col justify-center">
          <p className="text-[10px] font-black tracking-[0.2em] text-text-muted uppercase mb-3 opacity-60">Total Duration</p>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#8b5cf6]">
              {Math.floor(totalMinutes / 60)}<span className="text-2xl ml-1">H</span> {totalMinutes % 60}<span className="text-2xl ml-1">M</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 glass p-8 rounded-[2rem] border border-border/80 overflow-hidden">
          <p className="text-[10px] font-black tracking-[0.2em] text-text-muted uppercase mb-6 opacity-60">Fleet Contribution</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {Object.values(userAgg).map(u => (
              <div key={u.name} className="flex-shrink-0 bg-surface/50 border border-white/5 px-5 py-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] flex items-center justify-center text-white font-black text-sm shadow-glow">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-sm text-text">{u.name}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">{Math.floor(u.minutes / 60)}h {u.minutes % 60}m</p>
                </div>
              </div>
            ))}
            {Object.keys(userAgg).length === 0 && <p className="text-sm text-text-muted italic py-2">No activity logs recorded for this sector.</p>}
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-border overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-surface/30">
          <h3 className="font-black text-xs uppercase tracking-[0.3em] text-text-muted italic">Operational Flux Log</h3>
        </div>
        <div className="divide-y divide-border/40">
          {filteredLogs.length === 0 && <p className="p-16 text-center text-text-muted text-sm font-bold opacity-40">Zero frequency detection. Try expanding your search orbits.</p>}
          {filteredLogs.map(log => {
            const task = tasks.find(t => t.id === log.work_item);
            return (
              <div 
                key={log.id} 
                onClick={() => log.work_item && setSelectedTaskId(log.work_item)}
                className="flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-surface/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-4 bg-primary/10 text-primary rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-text group-hover:text-primary transition-colors">{log.note || 'Internal operation log'}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        {log.user?.first_name || 'System'} • {new Date(log.logged_at || log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-4">
                  {task && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl max-w-[200px]">
                      <code className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{task.task_code}</code>
                      <span className="text-[10px] font-black text-text-muted truncate uppercase tracking-widest">{task.title}</span>
                    </div>
                  )}
                  <div className="text-right shrink-0">
                    <span className="inline-block px-4 py-2 bg-primary/5 border border-primary/20 text-primary font-black text-xs rounded-xl uppercase tracking-[0.1em]">
                      {Math.floor(log.minutes / 60)}h {log.minutes % 60}m
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  );
}
