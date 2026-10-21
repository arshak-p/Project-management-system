import { useEffect, useState } from 'react';
import { api } from '../api';
import { Clock, Clock3, Download } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

export default function TimesheetsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);

  const load = () => {
    setIsLoading(true);
    Promise.all([api.getTasks(), api.getProjects(), api.getAllTimeLogs()])
      .then(([t, p, l]) => {
        setTasks(t.data);
        setProjects(p.data);
        setAllLogs(l.data);
      })
      .catch(err => console.error("Error fetching logs:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const filteredLogs = allLogs.filter(log => {
    let match = true;
    // Normalize log date to YYYY-MM-DD
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
    
    // Header
    const headers = ["Date", "Team Member", "Project", "Task", "Note", "Duration (mins)"];
    
    // Rows
    const rows = filteredLogs.map(log => {
      const taskObj = tasks.find(t => t.id === log.work_item);
      return [
        log.logged_at || log.created_at.split('T')[0],
        log.user?.first_name || 'System',
        taskObj?.project_name || 'General',
        taskObj?.title || 'Unknown Task',
        `"${log.note.replace(/"/g, '""')}"`, // escape quotes
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

  // Group by user
  const userAgg: Record<number, { name: string, minutes: number, id: number }> = {};
  filteredLogs.forEach(log => {
    const uid = log.user?.id || 0;
    if (!userAgg[uid]) userAgg[uid] = { name: log.user?.first_name || log.user?.email || 'Unknown', minutes: 0, id: uid };
    userAgg[uid].minutes += log.minutes;
  });

  // Unique users for dropdown
  const allUsersMap = new Map();
  allLogs.forEach(l => {
    if (l.user) allUsersMap.set(l.user.id, l.user.first_name || l.user.email);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
        />
      )}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock3 className="text-primary w-8 h-8" />
            Reporting & Timesheets
          </h1>
          <p className="text-text-muted mt-1 text-sm">Download professional activity reports for clients or payroll.</p>
        </div>

        <button 
          onClick={handleDownloadCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95"
        >
          <Download className="w-5 h-5" />
          Export (CSV)
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 glass p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-text-muted px-1 mb-1">Team Member</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-2 outline-none focus:border-primary min-w-[180px]">
              <option value="all">Every Specialist</option>
              {Array.from(allUsersMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-text-muted px-1 mb-1">Project / Client</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-2 outline-none focus:border-primary min-w-[180px]">
              <option value="all">All Clients</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">

            <label className="text-[10px] uppercase font-bold text-text-muted px-1 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-2 outline-none focus:border-primary" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-text-muted px-1 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface/50 border border-border text-sm rounded-xl px-3 py-2 outline-none focus:border-primary" style={{ colorScheme: 'dark' }} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today); setEndDate(today);
            }}
            className="px-3 py-1.5 glass border border-border rounded-lg text-xs font-bold hover:border-primary/50 transition-colors"
          >
            Today
          </button>
          <button 
            onClick={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - 7);
              setStartDate(start.toISOString().split('T')[0]);
              setEndDate(end.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 glass border border-border rounded-lg text-xs font-bold hover:border-primary/50 transition-colors"
          >
            Last 7 Days
          </button>
          <button 
            onClick={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(1); // First of month
              setStartDate(start.toISOString().split('T')[0]);
              setEndDate(end.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 glass border border-border rounded-lg text-xs font-bold hover:border-primary/50 transition-colors"
          >
            This Month
          </button>
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); setSelectedUser('all'); setSelectedProject('all'); }}
            className="px-3 py-1.5 text-text-muted hover:text-text text-xs font-bold transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-border/80">
          <p className="text-xs font-bold text-text-muted uppercase mb-1">Total Time Tracked</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#8b5cf6]">
              {Math.floor(totalMinutes / 60)}<span className="text-xl">h</span> {totalMinutes % 60}<span className="text-xl">m</span>
            </p>
          </div>
        </div>

        <div className="md:col-span-2 glass p-6 rounded-2xl border border-border/80 overflow-x-auto">
          <p className="text-xs font-bold text-text-muted uppercase mb-4">Time by Team Member</p>
          <div className="flex gap-4">
            {Object.values(userAgg).map(u => (
              <div key={u.name} className="flex-shrink-0 bg-surface/50 border border-border px-4 py-3 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] flex items-center justify-center text-white font-bold text-sm">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{u.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{Math.floor(u.minutes / 60)}h {u.minutes % 60}m logged</p>
                </div>
              </div>
            ))}
            {Object.keys(userAgg).length === 0 && <p className="text-sm text-text-muted">No time logs recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-surface/30">
          <h3 className="font-bold text-lg">Log Entries</h3>
        </div>
        <div className="divide-y divide-border/40">
          {filteredLogs.length === 0 && <p className="p-8 text-center text-text-muted text-sm">No time log entries exist for this filter.</p>}
          {filteredLogs.map(log => {
            const task = tasks.find(t => t.id === log.work_item);
            return (
              <div 
                key={log.id} 
                onClick={() => log.work_item && setSelectedTaskId(log.work_item)}
                className="flex items-center gap-4 p-4 hover:bg-surface/30 transition-colors cursor-pointer group"
              >
                <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="font-medium text-sm text-text">{log.note || 'No note provided'}</h4>
                  <span className="text-xs text-text-muted mt-0.5">
                    {log.user?.first_name || log.user?.email || 'System'} • {new Date(log.logged_at || log.created_at).toLocaleDateString()}
                  </span>
                </div>
                {task && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-lg max-w-[200px]">
                    <code className="text-xs text-primary">{task.task_code}</code>
                    <span className="text-xs text-text-muted truncate">{task.title}</span>
                  </div>
                )}
                <div className="text-right shrink-0 min-w-[80px]">
                  <span className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-sm rounded-lg">
                    {Math.floor(log.minutes / 60)}h {log.minutes % 60}m
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  );
}
