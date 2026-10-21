import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { api, errorMessage, fullName, ROLE_LABELS, type State, type Task } from '../api';
import { useAuth } from '../auth';
import ActivityFeed from '../components/ActivityFeed';
import TaskModal from '../components/TaskModal';
import { useLoad, useTaskOptions } from '../hooks';
import { Button, Card, Empty, ErrorBox, PageHeader, PriorityBadge, Spinner, fmtDate, fmtMinutes, todayISO } from '../ui';

const DONE = ['completed-launched', 'archived'];

export default function HomePage() {
  const { user } = useAuth();
  const opts = useTaskOptions();
  const data = useLoad(async () => {
    const [stats, tasks, states] = await Promise.all([api.analytics(), api.tasks(), api.states()]);
    return { stats, tasks, states };
  });
  const [open, setOpen] = useState<Task | null>(null);
  const [error, setError] = useState('');

  const today = todayISO();
  const stateId = (states: State[], slug: string) => states.find((s) => s.slug === slug)?.id;

  const mine = useMemo(
    () => (data.data?.tasks ?? []).filter((t) => t.assignee?.id === user?.id && !DONE.includes(t.state_slug)),
    [data.data, user],
  );
  const review = useMemo(() => (data.data?.tasks ?? []).filter((t) => t.state_slug === 'team-head-review'), [data.data]);

  if (data.loading || opts.loading) return <Spinner />;
  if (!data.data || !user) return <ErrorBox text={data.error || 'No data.'} />;
  const { stats, tasks, states } = data.data;

  const move = async (t: Task, slug: string) => {
    const id = stateId(states, slug);
    if (!id) return setError(`Workflow stage "${slug}" is missing. Ask an admin to add it under Settings.`);
    setError('');
    try { await api.updateTask(t.id, { state: id }); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  const due = [...tasks]
    .filter((t) => t.due_date && !DONE.includes(t.state_slug) && (user.role === 'specialist' || user.role === 'team_head' ? t.assignee?.id === user.id : true))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 6);

  const tiles = [
    { label: 'Open tasks', value: stats.totals.pending, icon: ListTodo },
    { label: 'Completed', value: stats.totals.completed_or_launched, icon: CheckCircle2 },
    { label: 'Time logged', value: fmtMinutes(stats.totals.total_time_minutes), icon: Clock },
  ];

  const row = (t: Task, actions?: React.ReactNode) => (
    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <button className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => setOpen(t)}>
        <span className="text-slate-400">{t.task_code}</span> {t.title}
        <span className="ml-2 text-slate-500">{t.state__name}</span>
      </button>
      <span className="flex shrink-0 items-center gap-2">
        <PriorityBadge priority={t.priority} />
        {t.due_date && <span className={t.due_date < today ? 'font-medium text-red-600' : 'text-slate-500'}>{fmtDate(t.due_date)}</span>}
        {actions}
      </span>
    </li>
  );

  return (
    <>
      <PageHeader title={`Hello, ${user.first_name || fullName(user)}`} subtitle={ROLE_LABELS[user.role]} />
      <ErrorBox text={error || data.error} />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <t.icon className="mb-2 h-5 w-5 text-brand" />
            <div className="text-2xl font-semibold">{t.value}</div>
            <div className="text-sm text-slate-500">{t.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {user.role === 'specialist' && (
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-1 font-medium">My tasks</h2>
            {mine.length === 0 && <Empty text="Nothing assigned to you right now." />}
            <ul className="divide-y divide-slate-100">
              {mine.map((t) =>
                row(t,
                  t.state_slug === 'in-progress'
                    ? <Button variant="ghost" onClick={() => move(t, 'team-head-review')}>Send for review</Button>
                    : ['pending', 'rework-revision'].includes(t.state_slug)
                      ? <Button variant="ghost" onClick={() => move(t, 'in-progress')}>Start</Button>
                      : null,
                ),
              )}
            </ul>
          </Card>
        )}

        {user.role === 'team_head' && (
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-1 font-medium">Waiting for your review</h2>
            {review.length === 0 && <Empty text="No work is waiting for review." />}
            <ul className="divide-y divide-slate-100">
              {review.map((t) =>
                row(t, (
                  <>
                    <Button variant="ghost" onClick={() => move(t, 'rework-revision')}>Send back</Button>
                    <Button onClick={() => move(t, 'client-review')}>Approve</Button>
                  </>
                )),
              )}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-1 font-medium">Due soon</h2>
          {due.length === 0 && <Empty text="Nothing due." />}
          <ul className="divide-y divide-slate-100">{due.map((t) => row(t))}</ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-medium">Tasks by status</h2>
          <ul className="space-y-2">
            {stats.by_state.map((s) => (
              <li key={s.state__slug} className="text-sm">
                <div className="mb-1 flex justify-between"><span>{s.state__name}</span><span className="text-slate-500">{s.c}</span></div>
                <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand" style={{ width: `${(s.c / Math.max(1, stats.totals.all)) * 100}%` }} /></div>
              </li>
            ))}
            {stats.by_state.length === 0 && <li className="text-sm text-slate-500">No tasks yet.</li>}
          </ul>
        </Card>
        {user.role !== 'specialist' && <ActivityFeed />}
      </div>

      {open && opts.data && (
        <TaskModal task={open} options={opts.data} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); data.reload(); }} />
      )}
    </>
  );
}
