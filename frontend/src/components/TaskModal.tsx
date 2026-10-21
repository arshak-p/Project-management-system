import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import {
  api, can, errorMessage, fullName, isCopywriterHead,
  type Attachment, type Comment, type Priority, type Task, type TimeLog,
} from '../api';
import { useAuth } from '../auth';
import type { TaskOptions } from '../hooks';
import { Button, ErrorBox, Field, Modal, fmtDate, fmtMinutes, inputCls } from '../ui';

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];
const DATE_FIELDS = ['posting_date', 'scheduled_date', 'due_date', 'deadline'] as const;
const DATE_LABELS: Record<(typeof DATE_FIELDS)[number], string> = {
  posting_date: 'Posting date', scheduled_date: 'Start date', due_date: 'Due date', deadline: 'Deadline',
};

type Field_ = 'title' | 'description' | 'project' | 'module' | 'state' | 'priority' | 'assignee_id' | 'content_writer_id'
  | 'posting_date' | 'scheduled_date' | 'due_date' | 'deadline' | 'reference_link';

/** Which fields the signed-in role may change on a task - mirrors the backend rules. */
function editableFields(task: Task | null, user: ReturnType<typeof useAuth>['user']): Set<Field_> {
  const all: Field_[] = ['title', 'description', 'project', 'module', 'state', 'priority', 'assignee_id', 'content_writer_id', 'posting_date', 'scheduled_date', 'due_date', 'deadline', 'reference_link'];
  if (!user) return new Set();
  if (!task || can.manage(user.role)) return new Set(all);
  switch (user.role) {
    case 'sales_manager': return new Set<Field_>(['title', 'module', 'posting_date']);
    case 'team_head': {
      const f = new Set<Field_>(['state', 'posting_date', 'scheduled_date', 'due_date', 'deadline']);
      if (isCopywriterHead(user)) f.add('content_writer_id');
      return f;
    }
    case 'specialist': {
      const f = new Set<Field_>();
      if (task.assignee?.id === user.id) { f.add('state'); f.add('reference_link'); }
      if (task.content_writer?.id === user.id) f.add('reference_link');
      return f;
    }
    default: return new Set();
  }
}

interface Props {
  task: Task | null; // null = create
  options: TaskOptions;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, options, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const editable = editableFields(task, user);
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    project: task?.project ?? options.projects[0]?.id ?? 0,
    module: task?.module ?? options.modules[0]?.id ?? 0,
    state: task?.state ?? options.states[0]?.id ?? 0,
    priority: (task?.priority ?? 'medium') as Priority,
    assignee_id: task?.assignee?.id ?? ('' as number | ''),
    content_writer_id: task?.content_writer?.id ?? ('' as number | ''),
    posting_date: task?.posting_date ?? '',
    scheduled_date: task?.scheduled_date ?? '',
    due_date: task?.due_date ?? '',
    deadline: task?.deadline ?? '',
    reference_link: task?.reference_link ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const can_ = (f: Field_) => editable.has(f);
  const readOnly = editable.size === 0;

  // Team members can only move their own cards forward to these two stages.
  const stateChoices = user?.role === 'specialist'
    ? options.states.filter((s) => s.id === task?.state || ['in-progress', 'team-head-review'].includes(s.slug))
    : options.states;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {};
      for (const f of editable) {
        let v: unknown = form[f];
        if ((DATE_FIELDS as readonly string[]).includes(f) && v === '') v = null;
        if ((f === 'assignee_id' || f === 'content_writer_id') && v === '') v = null;
        body[f] = v;
      }
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

  const people = options.people;
  return (
    <Modal title={task ? `${task.task_code} · ${task.title}` : 'New task'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <ErrorBox text={error} />
        {can_('title') && (
          <Field label="Title"><input className={inputCls} required maxLength={255} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        )}
        <Field label="Description">
          <textarea className={inputCls} rows={3} disabled={!can_('description')} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {can_('project') && (
            <Field label="Project">
              <select className={inputCls} required value={form.project} onChange={(e) => set('project', Number(e.target.value))}>
                {options.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Content type">
            <select className={inputCls} disabled={!can_('module')} value={form.module} onChange={(e) => set('module', Number(e.target.value))}>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} disabled={!can_('state')} value={form.state} onChange={(e) => set('state', Number(e.target.value))}>
              {stateChoices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} disabled={!can_('priority')} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          {can_('assignee_id') && (
            <Field label="Assignee">
              <select className={inputCls} value={form.assignee_id} onChange={(e) => set('assignee_id', e.target.value ? Number(e.target.value) : '')}>
                <option value="">Unassigned</option>
                {people.map((u) => <option key={u.id} value={u.id}>{fullName(u)}{u.title ? ` · ${u.title}` : ''}</option>)}
              </select>
            </Field>
          )}
          {(can_('content_writer_id')) && (
            <Field label="Content writer">
              <select className={inputCls} value={form.content_writer_id} onChange={(e) => set('content_writer_id', e.target.value ? Number(e.target.value) : '')}>
                <option value="">None</option>
                {people.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}
              </select>
            </Field>
          )}
          {DATE_FIELDS.map((f) => (
            <Field key={f} label={DATE_LABELS[f]}>
              <input className={inputCls} type="date" disabled={!can_(f)} value={form[f]} onChange={(e) => set(f, e.target.value)} />
            </Field>
          ))}
        </div>
        <Field label="Reference links">
          <textarea className={inputCls} rows={2} disabled={!can_('reference_link')} placeholder="Paste links, one per line" value={form.reference_link} onChange={(e) => set('reference_link', e.target.value)} />
        </Field>
        {task && readOnly && (
          <p className="text-sm text-slate-500">View only · Assigned to {fullName(task.assignee)}</p>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          {task && can.deleteTask(user?.role) ? <Button type="button" variant="danger" onClick={remove}>Delete</Button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && <Button type="submit" busy={busy}>{task ? 'Save' : 'Create task'}</Button>}
          </div>
        </div>
      </form>
      {task && <Discussion task={task} />}
    </Modal>
  );
}

function Discussion({ task }: { task: Task }) {
  const { user } = useAuth();
  const write = can.writeNotes(user?.role);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [text, setText] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => {
    api.comments(task.id).then(setComments).catch(() => undefined);
    api.timeLogs({ work_item: task.id }).then(setLogs).catch(() => undefined);
    api.attachments(task.id).then(setFiles).catch(() => undefined);
  };
  useEffect(() => { load(); api.recordView(task.id).catch(() => undefined); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guard = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); load(); } catch (err) { setError(errorMessage(err)); }
  };
  const mine = (id?: number) => id === user?.id || can.manage(user?.role);

  return (
    <div className="mt-6 space-y-6 border-t border-slate-200 pt-5">
      <ErrorBox text={error} />
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-2 font-medium">Comments</h3>
          <ul className="mb-3 max-h-56 space-y-2 overflow-y-auto">
            {comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-2.5 text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{fullName(c.author)} · {fmtDate(c.created_at)}</span>
                  {mine(c.author.id) && <button aria-label="Delete comment" onClick={() => guard(() => api.deleteComment(c.id))}><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
          {write && (
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
                  {mine(l.user?.id) && <button aria-label="Delete time log" onClick={() => guard(() => api.deleteTimeLog(l.id))}><Trash2 className="h-3.5 w-3.5 text-slate-500" /></button>}
                </span>
              </li>
            ))}
          </ul>
          {write && (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const m = Number(minutes); if (m > 0) guard(async () => { await api.addTimeLog(task.id, m, note); setMinutes(''); setNote(''); }); }}>
              <input className={inputCls + ' w-24'} type="number" min={1} max={1440} placeholder="Min" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <input className={inputCls} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit">Log</Button>
            </form>
          )}
        </section>
      </div>
      <section>
        <h3 className="mb-2 flex items-center justify-between font-medium">
          Files
          {write && (
            <>
              <input ref={fileInput} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) guard(() => api.addAttachment(task.id, f)); e.target.value = ''; }} />
              <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()}><Paperclip className="h-4 w-4" /> Attach file</Button>
            </>
          )}
        </h3>
        <ul className="space-y-1 text-sm">
          {files.length === 0 && <li className="text-slate-500">No files attached.</li>}
          {files.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
              <a href={a.file} target="_blank" rel="noreferrer" className="truncate text-brand hover:underline">{a.file_name}</a>
              {mine(a.uploaded_by?.id) && <button aria-label="Delete file" onClick={() => guard(() => api.deleteAttachment(a.id))}><Trash2 className="h-3.5 w-3.5 text-slate-500" /></button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
