import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { api, can, errorMessage, fullName, type Comment, type Priority, type Task, type TimeLog } from '../api';
import type { TaskOptions } from '../hooks';
import { useAuth } from '../auth';
import { Button, ErrorBox, Field, Modal, fmtDate, fmtMinutes, inputCls } from '../ui';

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

interface Props {
  task: Task | null; // null = create
  options: TaskOptions;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, options, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const role = user?.role;
  const isNew = !task;
  const fullEdit = isNew || can.editTaskFully(role);
  const canWrite = can.write(role);
  const memberEdit = !fullEdit && canWrite && task?.assignee?.id === user?.id;

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    project: task?.project ?? options.projects[0]?.id ?? 0,
    module: task?.module ?? options.modules[0]?.id ?? 0,
    state: task?.state ?? options.states[0]?.id ?? 0,
    priority: (task?.priority ?? 'medium') as Priority,
    assignee_id: task?.assignee?.id ?? ('' as number | ''),
    due_date: task?.due_date ?? '',
    scheduled_date: task?.scheduled_date ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const readOnly = !(fullEdit || memberEdit);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = fullEdit
        ? {
            ...form,
            assignee_id: form.assignee_id === '' ? null : form.assignee_id,
            due_date: form.due_date || null,
            scheduled_date: form.scheduled_date || null,
          }
        : { state: form.state, description: form.description };
      if (task) await api.updateTask(task.id, body);
      else await api.createTask(body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!task || !confirm(`Delete task ${task.task_code}?`)) return;
    try {
      await api.deleteTask(task.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title={task ? `${task.task_code} · ${task.title}` : 'New task'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <ErrorBox text={error} />
        {fullEdit && (
          <Field label="Title">
            <input className={inputCls} required maxLength={255} value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
        )}
        <Field label="Description">
          <textarea className={inputCls} rows={3} disabled={readOnly} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {fullEdit && (
            <>
              <Field label="Project">
                <select className={inputCls} required value={form.project} onChange={(e) => set('project', Number(e.target.value))}>
                  {options.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className={inputCls} required value={form.module} onChange={(e) => set('module', Number(e.target.value))}>
                  {options.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Status">
            <select className={inputCls} disabled={readOnly} value={form.state} onChange={(e) => set('state', Number(e.target.value))}>
              {options.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          {fullEdit && (
            <>
              <Field label="Priority">
                <select className={inputCls} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Assignee">
                <select className={inputCls} value={form.assignee_id} onChange={(e) => set('assignee_id', e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Unassigned</option>
                  {options.people.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}
                </select>
              </Field>
              <Field label="Start date">
                <input className={inputCls} type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} />
              </Field>
              <Field label="Due date">
                <input className={inputCls} type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
              </Field>
            </>
          )}
        </div>
        {!fullEdit && task && (
          <p className="text-sm text-slate-500">
            Assigned to {fullName(task.assignee)} · Due {fmtDate(task.due_date)} · Priority {task.priority}
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          {task && can.manage(role) ? <Button type="button" variant="danger" onClick={remove}>Delete</Button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && <Button type="submit" busy={busy}>{isNew ? 'Create task' : 'Save'}</Button>}
          </div>
        </div>
      </form>
      {task && <Discussion task={task} canWrite={canWrite} />}
    </Modal>
  );
}

function Discussion({ task, canWrite }: { task: Task; canWrite: boolean }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [text, setText] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.comments(task.id).then(setComments).catch(() => undefined);
    api.timeLogs({ work_item: task.id }).then(setLogs).catch(() => undefined);
  };
  useEffect(load, [task.id]);

  const guard = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); load(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <div className="mt-6 grid gap-6 border-t border-slate-200 pt-5 md:grid-cols-2">
      <section>
        <h3 className="mb-2 font-medium">Comments</h3>
        <ErrorBox text={error} />
        <ul className="mb-3 max-h-56 space-y-2 overflow-y-auto">
          {comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-slate-50 p-2.5 text-sm">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{fullName(c.author)} · {fmtDate(c.created_at)}</span>
                {(c.author.id === user?.id || can.manage(user?.role)) && (
                  <button aria-label="Delete comment" onClick={() => guard(() => api.deleteComment(c.id))}><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
        {canWrite && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) guard(async () => { await api.addComment(task.id, text); setText(''); }); }}>
            <input className={inputCls} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} />
            <Button type="submit">Send</Button>
          </form>
        )}
      </section>
      <section>
        <h3 className="mb-2 font-medium">Time logged · {fmtMinutes(logs.reduce((a, l) => a + l.minutes, 0))}</h3>
        <ul className="mb-3 max-h-56 space-y-2 overflow-y-auto">
          {logs.length === 0 && <li className="text-sm text-slate-500">No time logged yet.</li>}
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between rounded-lg bg-slate-50 p-2.5 text-sm">
              <span>{fullName(l.user)}{l.note && ` — ${l.note}`}</span>
              <span className="flex items-center gap-2">
                {fmtMinutes(l.minutes)}
                {(l.user.id === user?.id || can.manage(user?.role)) && (
                  <button aria-label="Delete time log" onClick={() => guard(() => api.deleteTimeLog(l.id))}><Trash2 className="h-3.5 w-3.5 text-slate-500" /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const m = Number(minutes);
              if (m > 0) guard(async () => { await api.addTimeLog(task.id, m, note); setMinutes(''); setNote(''); });
            }}
          >
            <input className={inputCls + ' w-24'} type="number" min={1} max={1440} placeholder="Min" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            <input className={inputCls} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit">Log</Button>
          </form>
        )}
      </section>
    </div>
  );
}
