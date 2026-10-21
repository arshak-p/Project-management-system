import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api, fullName, type Task } from '../../api';
import { useAuth } from '../../auth';
import TaskModal from '../../components/TaskModal';
import { useLoad, useTaskOptions } from '../../hooks';
import { Badge, Card, Empty, ErrorBox, PriorityBadge, Spinner, fmtDate, inputCls } from '../../ui';

export default function ListView() {
  const { user } = useAuth();
  const tasks = useLoad(() => api.tasks());
  const opts = useTaskOptions();
  const [q, setQ] = useState('');
  const [project, setProject] = useState('');
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(undefined);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (tasks.data ?? []).filter(
      (t) =>
        (!needle || t.title.toLowerCase().includes(needle) || t.task_code.toLowerCase().includes(needle)) &&
        (!project || t.project === Number(project)) &&
        (!status || t.state === Number(status)) &&
        (!mine || t.assignee?.id === user?.id),
    );
  }, [tasks.data, q, project, status, mine, user]);

  if (tasks.loading || opts.loading) return <Spinner />;
  const o = opts.data;
  const stateName = (id: number) => o?.states.find((s) => s.id === id)?.name ?? '—';
  const projectName = (id: number) => o?.projects.find((p) => p.id === id)?.name ?? '—';

  return (
    <>
      <ErrorBox text={tasks.error || opts.error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={inputCls + ' pl-9'} placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={inputCls + ' w-auto'} value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project">
          <option value="">All projects</option>
          {o?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={inputCls + ' w-auto'} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {o?.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {user?.role !== 'specialist' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Mine
          </label>
        )}
      </div>
      <Card className="overflow-x-auto">
        {rows.length === 0 ? <Empty text="No tasks match." /> : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setEditing(t)}>
                  <td className="px-4 py-3"><span className="text-slate-400">{t.task_code}</span> <span className="font-medium">{t.title}</span></td>
                  <td className="px-4 py-3">{projectName(t.project)}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{stateName(t.state)}</Badge></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3">{fullName(t.assignee)}</td>
                  <td className="px-4 py-3">{fmtDate(t.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing !== undefined && o && (
        <TaskModal task={editing} options={o} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); tasks.reload(); }} />
      )}
    </>
  );
}
