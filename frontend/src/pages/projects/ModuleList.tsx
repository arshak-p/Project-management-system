import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api, can, errorMessage, type Module } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { Button, Card, Empty, ErrorBox, Field, Modal, Spinner, inputCls } from '../../ui';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Content types (modules). Each can require a job title, which limits who can be assigned. */
export default function ModuleList() {
  const { user } = useAuth();
  const manage = can.manageProjects(user?.role);
  const data = useLoad(async () => ({ modules: await api.modules(), titles: await api.jobTitles() }));
  const [editing, setEditing] = useState<Module | null | undefined>(undefined);
  const [error, setError] = useState('');

  if (data.loading) return <Spinner />;

  const archive = async (m: Module) => {
    if (!confirm(`Archive "${m.name}"?`)) return;
    try { await api.deleteModule(m.id); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Content types, such as Reel, Poster or Blog post</p>
        {manage && <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New type</Button>}
      </div>
      <ErrorBox text={error || data.error} />
      <Card>
        {data.data?.modules.length === 0 ? <Empty text="No content types yet." /> : (
          <ul className="divide-y divide-slate-100">
            {data.data?.modules.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-slate-500">{m.job_title_name ? `Done by: ${m.job_title_name}` : 'Anyone can be assigned'}</div>
                </div>
                {manage && (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditing(m)}>Edit</Button>
                    <Button variant="ghost" onClick={() => archive(m)}>Archive</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing !== undefined && data.data && (
        <ModuleForm module={editing} titles={data.data.titles} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); data.reload(); }} />
      )}
    </>
  );
}

function ModuleForm({ module, titles, onClose, onSaved }: { module: Module | null; titles: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(module?.name ?? '');
  const [job, setJob] = useState<number | ''>(module?.job_title ?? '');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.saveModule({ name, slug: module?.slug ?? slugify(name), job_title: job === '' ? null : job }, module?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title={module ? 'Edit content type' : 'New content type'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <Field label="Name"><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Done by (job title)">
          <select className={inputCls} value={job} onChange={(e) => setJob(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Anyone</option>
            {titles.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}
