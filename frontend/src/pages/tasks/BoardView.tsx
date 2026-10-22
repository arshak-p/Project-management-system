import { useState } from 'react';
import { api, can, errorMessage, fullName, type Task } from '../../api';
import { useAuth } from '../../auth';
import TaskModal from '../../components/TaskModal';
import { useLoad, useTaskOptions } from '../../hooks';
import { allowedStates } from '../../workflow';
import { Card, ErrorBox, PriorityBadge, Spinner, cx, fmtDate, inputCls } from '../../ui';

export default function BoardView() {
  const { user } = useAuth();
  const tasks = useLoad(() => api.tasks(), [], { live: true });
  const opts = useTaskOptions();
  const [project, setProject] = useState('');
  const [open, setOpen] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overState, setOverState] = useState<number | null>(null);
  const [error, setError] = useState('');

  if (tasks.loading || opts.loading) return <Spinner />;
  const o = opts.data;
  if (!o) return <ErrorBox text={opts.error} />;
  const movable = can.moveCard(user?.role);
  const visible = (tasks.data ?? []).filter((t) => !project || t.project === Number(project));

  const move = async (taskId: number, stateId: number) => {
    const t = tasks.data?.find((x) => x.id === taskId);
    if (!t || t.state === stateId) return;
    setError('');
    try {
      const res = await api.reorder([{ id: taskId, state: stateId, board_position: 0 }]);
      const rejected = (res.data as { rejected?: { reason: string }[] }).rejected ?? [];
      if (rejected.length) setError(rejected[0].reason);
    } catch (err) {
      setError(errorMessage(err));
    }
    tasks.reload();
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className={inputCls + ' w-auto'} value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project">
          <option value="">All projects</option>
          {o.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-sm text-slate-500">{movable ? 'Drag a card, or use the status menu on it.' : 'Read-only view'}</span>
      </div>
      <ErrorBox text={error || tasks.error} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {o.states.map((s) => {
          const col = visible.filter((t) => t.state === s.id);
          return (
            <section
              key={s.id}
              aria-label={s.name}
              className={cx('w-72 shrink-0 rounded-xl bg-slate-100 p-3', overState === s.id && 'ring-2 ring-brand')}
              onDragOver={(e) => { if (movable) { e.preventDefault(); setOverState(s.id); } }}
              onDragLeave={() => setOverState(null)}
              onDrop={() => { setOverState(null); if (dragId) move(dragId, s.id); setDragId(null); }}
            >
              <h2 className="mb-3 flex justify-between px-1 text-sm font-semibold">{s.name}<span className="text-slate-400">{col.length}</span></h2>
              <div className="space-y-2">
                {col.map((t) => {
                  const mine = t.assignee?.id === user?.id;
                  const draggable = movable && (can.manage(user?.role) || user?.role === 'team_head' || mine);
                  const choices = allowedStates(user?.role, t.state_slug, o.states);
                  return (
                    <Card key={t.id} className="cursor-pointer p-3 text-sm">
                      <div draggable={draggable} onDragStart={() => setDragId(t.id)} onClick={() => setOpen(t)}>
                        <div className="text-xs text-slate-400">{t.task_code}</div>
                        <div className="mb-2 font-medium">{t.title}</div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <PriorityBadge priority={t.priority} />
                          <span>{fullName(t.assignee)} · {fmtDate(t.due_date)}</span>
                        </div>
                      </div>
                      {draggable && (
                        <select aria-label="Move to status" className={inputCls + ' mt-2 py-1 text-xs'} value={t.state} onChange={(e) => move(t.id, Number(e.target.value))}>
                          {choices.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {open && <TaskModal task={open} options={o} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); tasks.reload(); }} />}
    </>
  );
}
