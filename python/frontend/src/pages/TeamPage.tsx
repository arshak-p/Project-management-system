import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, can, errorMessage, fullName, ROLE_LABELS, type Role, type User } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { Badge, Button, Card, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls } from '../ui';

const ROLES: Role[] = ['admin', 'project_manager', 'team_head', 'specialist', 'sales_manager'];

export default function TeamPage() {
  const { user: me } = useAuth();
  const isAdmin = can.admin(me?.role);
  const data = useLoad(async () => {
    const [users, departments, titles] = await Promise.all([api.users(), api.departments(), api.jobTitles()]);
    return { users, departments, titles };
  });
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  if (data.loading) return <Spinner />;
  const deptName = (id?: number | null) => data.data?.departments.find((d) => d.id === id)?.name ?? '—';
  // Project managers may not manage admins, and only admins hand out admin / PM roles.
  const editable = (u: User) => isAdmin || u.role !== 'admin';
  const roleChoices = ROLES.filter((r) => isAdmin || (r !== 'admin' && r !== 'project_manager'));

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${data.data?.users.length ?? 0} people`}
        action={isAdmin && <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add person</Button>}
      />
      <ErrorBox text={error || data.error} />
      <Card className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Department</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.data?.users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><div className="font-medium">{fullName(u)}</div><div className="text-slate-500">{u.email}</div></td>
                <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'green' : 'slate'}>{ROLE_LABELS[u.role]}</Badge></td>
                <td className="px-4 py-3">{u.title || '—'}</td>
                <td className="px-4 py-3">{deptName(u.department_id)}</td>
                <td className="px-4 py-3 text-right">
                  {editable(u) && (
                    <span className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
                      {u.id !== me?.id && (
                        <Button variant="ghost" aria-label={`Deactivate ${fullName(u)}`} onClick={() => confirm(`Deactivate ${fullName(u)}? They will no longer be able to sign in.`) && run(() => api.deactivateUser(u.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-medium">Job titles</h2>
        <p className="mb-3 text-sm text-slate-500">Used when editing a person.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {data.data?.titles.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
              {t.name}
              <button aria-label={`Remove ${t.name}`} onClick={() => run(() => api.deleteJobTitle(t.id))}><Trash2 className="h-3 w-3 text-slate-500" /></button>
            </span>
          ))}
        </div>
        <form className="flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) run(async () => { await api.addJobTitle(title.trim()); setTitle(''); }); }}>
          <input className={inputCls} placeholder="e.g. Video Editor" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      {editing !== undefined && data.data && (
        <PersonForm
          person={editing}
          roles={roleChoices}
          departments={data.data.departments}
          titles={data.data.titles.map((t) => t.name)}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); data.reload(); }}
        />
      )}
    </>
  );
}

function PersonForm({ person, roles, departments, titles, onClose, onSaved }: {
  person: User | null; roles: Role[]; departments: { id: number; name: string }[]; titles: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    first_name: person?.first_name ?? '', last_name: person?.last_name ?? '', email: person?.email ?? '', password: '',
    role: person?.role ?? ('specialist' as Role), title: person?.title ?? '', department_id: person?.department_id ?? ('' as number | ''),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (person) {
        await api.updateUser(person.id, { first_name: f.first_name, last_name: f.last_name, role: f.role, title: f.title, department_id: f.department_id === '' ? null : f.department_id });
      } else {
        const res = await api.createUser({ first_name: f.first_name, last_name: f.last_name, email: f.email, password: f.password, role: f.role, title: f.title });
        if (f.department_id !== '') await api.updateUser(res.data.id, { department_id: f.department_id });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={person ? `Edit ${fullName(person)}` : 'Add person'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input className={inputCls} required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
        </div>
        {!person && (
          <>
            <Field label="Email"><input className={inputCls} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Temporary password"><input className={inputCls} type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(roles.includes(f.role) ? roles : [f.role, ...roles]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select className={inputCls} value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Job title">
          <input className={inputCls} list="job-titles" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <datalist id="job-titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Save</Button></div>
      </form>
    </Modal>
  );
}
