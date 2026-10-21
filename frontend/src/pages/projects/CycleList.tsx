import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, can, errorMessage } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { Button, Card, Empty, ErrorBox, Field, Modal, Spinner, fmtDate, inputCls, todayISO } from '../../ui';

export default function CycleList() {
  const { user } = useAuth();
  const manage = can.manageProjects(user?.role);
  const data = useLoad(async () => ({ cycles: await api.cycles(), projects: await api.projects() }));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  if (data.loading) return <Spinner />;
  const projectName = (id: number) => data.data?.projects.find((p) => p.id === id)?.name ?? '—';
  const today = todayISO();

  const remove = async (id: number) => {
    if (!confirm('Delete this cycle?')) return;
    try { await api.deleteCycle(id); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Monthly campaign windows per project</p>
        {manage && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New cycle</Button>}
      </div>
      <ErrorBox text={error || data.error} />
      <Card>
        {data.data?.cycles.length === 0 ? <Empty text="No cycles yet." /> : (
          <ul className="divide-y divide-slate-100">
            {data.data?.cycles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-slate-500">{projectName(c.project)} · {fmtDate(c.start_date)} → {fmtDate(c.end_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {c.start_date <= today && today <= c.end_date && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>}
                  {manage && <button aria-label="Delete cycle" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-slate-500" /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {adding && data.data && <CycleForm projects={data.data.projects} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); data.reload(); }} />}
    </>
  );
}

function CycleForm({ projects, onClose, onSaved }: { projects: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ project: projects[0]?.id ?? 0, name: '', start_date: todayISO(), end_date: todayISO() });
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.end_date < f.start_date) return setError('End date must be after the start date.');
    try { await api.saveCycle(f); onSaved(); } catch (err) { setError(errorMessage(err)); }
  };
  return (
    <Modal title="New cycle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <Field label="Project"><select className={inputCls} value={f.project} onChange={(e) => setF({ ...f, project: Number(e.target.value) })}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><input className={inputCls} type="date" required value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="End"><input className={inputCls} type="date" required value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Create</Button></div>
      </form>
    </Modal>
  );
}
