import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api, can, errorMessage, type State } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { Button, Card, Empty, ErrorBox, Field, Modal, Spinner, inputCls } from '../../ui';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The stages every task moves through (To do, In progress, Review...). */
export default function WorkflowList() {
  const { user } = useAuth();
  const manage = can.manageWorkflow(user?.role);
  const [archived, setArchived] = useState(false);
  const data = useLoad(() => api.states({ archived }), [archived]);
  const [editing, setEditing] = useState<State | null | undefined>(undefined);
  const [error, setError] = useState('');

  if (data.loading) return <Spinner />;
  const rows = (data.data ?? []).filter((s) => (archived ? !s.is_active : s.is_active));
  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Stages a task moves through, in order. Some stages have special rules, so rename with care.</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Archived</label>
          {manage && <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New stage</Button>}
        </div>
      </div>
      <ErrorBox text={error || data.error} />
      <Card>
        {rows.length === 0 ? <Empty text="No stages." /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-slate-500">{s.description || s.slug}</div>
                  </div>
                </div>
                {manage && (
                  <div className="flex gap-2">
                    {s.is_active ? (
                      <>
                        <Button variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                        <Button variant="ghost" onClick={() => confirm(`Archive "${s.name}"? Tasks in this stage may disappear from the board.`) && run(() => api.deleteState(s.id))}>Archive</Button>
                      </>
                    ) : <Button variant="ghost" onClick={() => run(() => api.restoreState(s.id))}>Restore</Button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing !== undefined && <StateForm state={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); data.reload(); }} />}
    </>
  );
}

function StateForm({ state, onClose, onSaved }: { state: State | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: state?.name ?? '', description: state?.description ?? '', color: state?.color ?? '#3b82f6' });
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.saveState({ ...f, slug: state?.slug ?? slugify(f.name), is_active: true }, state?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal title={state ? 'Edit stage' : 'New stage'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Description"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Colour"><input type="color" className="h-10 w-20 rounded border border-slate-300" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}
