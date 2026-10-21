import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Task } from '../../api';
import TaskModal from '../../components/TaskModal';
import { useLoad, useTaskOptions } from '../../hooks';
import { Button, Card, ErrorBox, Spinner, cx, todayISO } from '../../ui';

const iso = (d: Date) => d.toLocaleDateString('en-CA');

export default function CalendarView() {
  const tasks = useLoad(() => api.tasks());
  const opts = useTaskOptions();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [open, setOpen] = useState<Task | null>(null);

  const days = useMemo(() => {
    const first = new Date(month);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    (tasks.data ?? []).forEach((t) => {
      if (!t.due_date) return;
      m.set(t.due_date, [...(m.get(t.due_date) ?? []), t]);
    });
    return m;
  }, [tasks.data]);

  const today = todayISO();
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const agenda = [...byDay.entries()].filter(([day]) => day.startsWith(monthKey)).sort(([a], [b]) => (a < b ? -1 : 1));

  if (tasks.loading || opts.loading) return <Spinner />;
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="w-36 text-center font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <Button variant="ghost" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <ErrorBox text={tasks.error} />
      <Card className="md:hidden">
        {agenda.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No tasks due this month.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {agenda.map(([day, items]) => (
              <li key={day} className="px-4 py-3">
                <div className={cx('mb-1 text-xs font-semibold uppercase', day === today ? 'text-brand' : 'text-slate-500')}>
                  {new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                {items.map((t) => (
                  <button key={t.id} onClick={() => setOpen(t)} className="mb-1 block w-full rounded bg-brand-soft px-2 py-1.5 text-left text-sm text-brand">{t.title}</button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[42rem] grid-cols-7 text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="border-b border-slate-200 p-2 font-medium text-slate-500">{d}</div>)}
          {days.map((d) => {
            const key = iso(d);
            const items = byDay.get(key) ?? [];
            return (
              <div key={key} className={cx('min-h-24 border-b border-r border-slate-100 p-1.5', d.getMonth() !== month.getMonth() && 'bg-slate-50 text-slate-400')}>
                <div className={cx('mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full', key === today && 'bg-brand text-white')}>{d.getDate()}</div>
                {items.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => setOpen(t)} className="mb-0.5 block w-full truncate rounded bg-brand-soft px-1 py-0.5 text-left text-brand hover:bg-green-100">{t.title}</button>
                ))}
                {items.length > 3 && <div className="text-slate-500">+{items.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </Card>
      {open && opts.data && <TaskModal task={open} options={opts.data} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); tasks.reload(); }} />}
    </>
  );
}
