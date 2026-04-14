import { useEffect, useState } from 'react';
import { api } from '../../api';
import { CheckCircle2, CircleDashed, Clock, Bell, AlertTriangle, ArrowUp, Circle, Calendar } from 'lucide-react';
import TaskDetailModal from '../../components/TaskDetailModal';
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  urgent: <AlertTriangle className="w-3 h-3" />,
  high: <ArrowUp className="w-3 h-3" />,
  medium: <Circle className="w-3 h-3" />,
  low: <Circle className="w-3 h-3" />,
};

export default function MyTasksPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [me, setMe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'due_today' | 'overdue'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = () => {
    Promise.all([api.getTasks(), api.getMe()])
      .then(([t, m]) => {
        setMe(m.data);
        const myTasks = t.data.filter((task: { assignee?: { id: number } }) => task.assignee?.id === m.data.id);
        setTasks(myTasks);
      })
      .catch(err => console.error("Error fetching my tasks:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];

  const filtered = tasks.filter(t => {
    if (filter === 'urgent') return t.priority === 'urgent';
    if (filter === 'due_today') return t.due_date === today;
    if (filter === 'overdue') return t.due_date && t.due_date < today;
    return true;
  });

  const urgentCount = tasks.filter(t => t.priority === 'urgent').length;
  const dueTodayCount = tasks.filter(t => t.due_date === today).length;
  const overdueCount = tasks.filter(t => t.due_date && t.due_date < today).length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
        />
      )}
      <div>
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-text-muted mt-1">All tasks currently assigned to you, {me?.first_name || me?.email}.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned', value: tasks.length, icon: <CircleDashed className="w-5 h-5" />, color: 'primary' },
          { label: 'Urgent', value: urgentCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'red-400' },
          { label: 'Due Today', value: dueTodayCount, icon: <Clock className="w-5 h-5" />, color: 'orange-400' },
          { label: 'Overdue', value: overdueCount, icon: <Bell className="w-5 h-5" />, color: 'error' },
        ].map(s => (
          <div key={s.label} className="glass p-4 rounded-xl border border-border/50">
            <div className={`p-2 bg-${s.color}/10 text-${s.color} w-fit rounded-lg mb-3`}>{s.icon}</div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'urgent', label: '🔴 Urgent' },
          { key: 'due_today', label: '📅 Due Today' },
          { key: 'overdue', label: '⚠️ Overdue' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filter === f.key
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'glass border-border text-text-muted hover:text-text hover:border-border/80'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-2 text-xs bg-surface px-1.5 py-0.5 rounded-full border border-border">
                {f.key === 'urgent' ? urgentCount : f.key === 'due_today' ? dueTodayCount : overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg">
              {filter === 'all' ? 'No tasks assigned yet!' : 'No tasks in this filter'}
            </h3>
            <p className="text-text-muted text-sm mt-1">
              {filter === 'all' ? 'Your manager will assign tasks to you soon.' : 'Try switching to "All Tasks".'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(task => {
              const isOverdue = task.due_date && task.due_date < today;
              return (
                <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex items-center gap-4 px-5 py-4 hover:bg-surface/30 transition-colors group cursor-pointer">
                  <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-400' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{task.task_code}</code>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${PRIORITY_COLORS[task.priority] || ''}`}>
                        {PRIORITY_ICONS[task.priority]} {task.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-text text-sm">{task.title}</h4>
                    {task.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{task.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-xs bg-surface border border-border px-2.5 py-1 rounded-full text-text-muted">
                      State #{task.state}
                    </span>
                    {task.due_date && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        isOverdue ? 'text-red-400 bg-red-400/10' : 'text-orange-300 bg-orange-400/10'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? 'Overdue: ' : 'Due: '}{task.due_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border/50 bg-surface/20 text-xs text-text-muted flex justify-between">
            <span>Showing {filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
            <span>{urgentCount} urgent • {overdueCount} overdue</span>
          </div>
        )}
      </div>
    </div>
  );
}
