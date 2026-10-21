import { useMemo } from 'react';
import { CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { api, fullName, ROLE_LABELS } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import ActivityFeed from './ActivityPage';
import { Card, ErrorBox, PageHeader, PriorityBadge, Spinner, fmtDate, fmtMinutes, todayISO } from '../ui';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useLoad(async () => {
    const [stats, tasks] = await Promise.all([api.analytics(), api.tasks()]);
    return { stats, tasks };
  });

  const upcoming = useMemo(() => {
    if (!data || !user) return [];
    const today = todayISO();
    const doneStates = new Set(data.stats.by_state.filter((s) => /approved|launched|done|completed/.test(s.state__slug)).map((s) => s.state__slug));
    return data.tasks
      .filter((t) => t.due_date && !doneStates.has(t.state_slug) && (user.role === 'specialist' ? true : t.assignee?.id === user.id))
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .slice(0, 6)
      .map((t) => ({ ...t, overdue: t.due_date! < today }));
  }, [data, user]);

  if (loading) return <Spinner />;
  if (!data || !user) return <ErrorBox text={error || 'No data.'} />;
  const { stats } = data;

  const tiles = [
    { label: 'Open', value: stats.totals.pending, icon: ListTodo },
    { label: 'Completed', value: stats.totals.completed_or_launched, icon: CheckCircle2 },
    { label: 'Time logged', value: fmtMinutes(stats.totals.total_time_minutes), icon: Clock },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.first_name || fullName(user)}`} subtitle={ROLE_LABELS[user.role]} />
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
        <Card className="p-5">
          <h2 className="mb-3 font-medium">Due soon</h2>
          {upcoming.length === 0 && <p className="text-sm text-slate-500">Nothing due. Nice work.</p>}
          <ul className="divide-y divide-slate-100">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate"><span className="text-slate-400">{t.task_code}</span> {t.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <span className={t.overdue ? 'font-medium text-red-600' : 'text-slate-500'}>{fmtDate(t.due_date)}</span>
                </span>
              </li>
            ))}
          </ul>
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
    </>
  );
}
