import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api, fullName } from '../api';
import { useLoad } from '../hooks';
import { Button, Card, Empty, ErrorBox, PageHeader, Spinner, fmtDate, fmtMinutes, inputCls } from '../ui';

const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export default function TimesheetsPage() {
  const data = useLoad(async () => {
    const [logs, tasks] = await Promise.all([api.timeLogs(), api.tasks()]);
    return { logs, tasks };
  });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo(() => {
    if (!data.data) return [];
    const byId = new Map(data.data.tasks.map((t) => [t.id, t]));
    return data.data.logs
      .filter((l) => (!from || l.logged_at.slice(0, 10) >= from) && (!to || l.logged_at.slice(0, 10) <= to))
      .map((l) => ({ ...l, task: l.work_item == null ? undefined : byId.get(l.work_item) }));
  }, [data.data, from, to]);

  const perPerson = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(fullName(r.user), (m.get(fullName(r.user)) ?? 0) + r.minutes));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const exportCsv = () => {
    const head = ['Date', 'Person', 'Task', 'Title', 'Minutes', 'Note'];
    const lines = rows.map((r) => [r.logged_at.slice(0, 10), fullName(r.user), r.task?.task_code ?? '', r.task?.title ?? '', r.minutes, r.note].map(csvCell).join(','));
    const blob = new Blob([[head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timesheet-${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (data.loading) return <Spinner />;
  const total = rows.reduce((a, r) => a + r.minutes, 0);

  return (
    <>
      <PageHeader
        title="Timesheets"
        subtitle={`${fmtMinutes(total)} across ${rows.length} entries`}
        action={<Button variant="ghost" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export CSV</Button>}
      />
      <ErrorBox text={data.error} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label>From <input type="date" className={inputCls + ' ml-1 w-auto'} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" className={inputCls + ' ml-1 w-auto'} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {perPerson.length > 1 && (
        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-medium">By person</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {perPerson.map(([name, m]) => <li key={name}>{name}: <span className="font-medium">{fmtMinutes(m)}</span></li>)}
          </ul>
        </Card>
      )}
      <Card className="md:hidden">
        {rows.length === 0 ? <Empty text="No time logged in this period." /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{fullName(r.user)}</span>
                  <span className="font-medium">{fmtMinutes(r.minutes)}</span>
                </div>
                <div className="text-slate-500">{r.task ? `${r.task.task_code} ${r.task.title}` : `#${r.work_item}`}</div>
                <div className="text-xs text-slate-400">{fmtDate(r.logged_at)}{r.note ? ` · ${r.note}` : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="hidden overflow-x-auto md:block">
        {rows.length === 0 ? <Empty text="No time logged in this period." /> : (
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Person</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{fmtDate(r.logged_at)}</td>
                  <td className="px-4 py-3">{fullName(r.user)}</td>
                  <td className="px-4 py-3">{r.task ? `${r.task.task_code} ${r.task.title}` : `#${r.work_item}`}</td>
                  <td className="px-4 py-3 font-medium">{fmtMinutes(r.minutes)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
