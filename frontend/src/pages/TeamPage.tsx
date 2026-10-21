import { useState, type FormEvent } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api, can, errorMessage, fullName, ROLE_LABELS, type Role, type User } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { Badge, Button, Card, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls } from '../ui';

const ROLES: Role[] = ['admin', 'project_manager', 'team_head', 'specialist', 'hr', 'sales_manager', 'client'];

export default function TeamPage() {
  const { user: me } = useAuth();
  const manage = can.manageTeam(me?.role);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState('');
  const data = useLoad(async () => {
    const [users, titles, departments] = await Promise.all([
      api.users({ archived }), api.jobTitles().catch(() => []), api.departments().catch(() => []),
    ]);
    return { users, titles, departments };
  }, [archived]);
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  if (data.loading) return <Spinner />;
  // Only admins hand out the admin role; HR works below that.
  const roleChoices = ROLES.filter((r) => me?.role === 'admin' || r !== 'admin');
  const needle = q.trim().toLowerCase();
  const rows = (data.data?.users ?? []).filter(
    (u) => archived ? !u.is_active : u.is_active !== false,
  ).filter((u) => !needle || `${fullName(u)} ${u.email} ${u.title ?? ''}`.toLowerCase().includes(needle));

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); data.reload(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${rows.length} ${archived ? 'inactive' : 'active'} people`}
        action={manage && <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add person</Button>}
      />
      <ErrorBox text={error || data.error} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={inputCls + ' pl-9'} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {manage && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show inactive
          </label>
        )}
      </div>
      <Card className="mb-6 md:hidden">
        <ul className="divide-y divide-slate-100">
          {rows.map((u) => (
            <li key={u.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{fullName(u)}</div>
                  <div className="truncate text-slate-500">{u.email}</div>
                  <div className="text-slate-500">{u.title || 'No job title'}</div>
                </div>
                <Badge tone={u.role === 'admin' ? 'green' : 'slate'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
              </div>
              {manage && (
                <div className="flex gap-2">
                  {u.is_active === false
                    ? <Button variant="ghost" onClick={() => run(() => api.restoreUser(u.id))}>Restore</Button>
                    : (
                      <>
                        <Button variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
                        {u.id !== me?.id && (
                          <Button variant="ghost" aria-label={`Deactivate ${fullName(u)}`} onClick={() => confirm(`Deactivate ${fullName(u)}? They will no longer be able to sign in.`) && run(() => api.deactivateUser(u.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mb-6 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><div className="font-medium">{fullName(u)}</div><div className="text-slate-500">{u.email}</div></td>
                <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'green' : 'slate'}>{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                <td className="px-4 py-3">{u.title || '—'}</td>
                <td className="px-4 py-3">
                  {manage && (
                    <span className="flex justify-end gap-2">
                      {u.is_active === false
                        ? <Button variant="ghost" onClick={() => run(() => api.restoreUser(u.id))}>Restore</Button>
                        : (
                          <>
                            <Button variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
                            {u.id !== me?.id && (
                              <Button variant="ghost" aria-label={`Deactivate ${fullName(u)}`} onClick={() => confirm(`Deactivate ${fullName(u)}? They will no longer be able to sign in.`) && run(() => api.deactivateUser(u.id))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {manage && (
        <Card className="p-5">
          <h2 className="mb-1 font-medium">Job titles</h2>
          <p className="mb-3 text-sm text-slate-500">Shown when adding or editing a person.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {data.data?.titles.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
                {t.name}
                <button aria-label={`Remove ${t.name}`} onClick={() => run(() => api.deleteJobTitle(t.id))}><Trash2 className="h-3 w-3 text-slate-500" /></button>
              </span>
            ))}
          </div>
          <form className="flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) run(async () => { await api.addJobTitle(newTitle.trim()); setNewTitle(''); }); }}>
            <input className={inputCls} placeholder="e.g. Video Editor" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button type="submit">Add</Button>
          </form>
        </Card>
      )}

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

interface FormProps {
  person: User | null; roles: Role[]; departments: { id: number; name: string }[]; titles: string[]; onClose: () => void; onSaved: () => void;
}

/** New people are verified by emailing a 6-digit code first; existing people are edited directly. */
function PersonForm({ person, roles, departments, titles, onClose, onSaved }: FormProps) {
  const { user: me } = useAuth();
  const [step, setStep] = useState<'email' | 'code' | 'details'>(person ? 'details' : 'email');
  const [f, setF] = useState({
    first_name: person?.first_name ?? '', last_name: person?.last_name ?? '', email: person?.email ?? '', password: '',
    role: person?.role ?? ('specialist' as Role), title: person?.title ?? '', phone: person?.phone ?? '',
    date_of_birth: person?.date_of_birth ?? '', department_id: person?.department_id ?? ('' as number | ''),
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSelf = person?.id === me?.id;

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const sendCode = (e: FormEvent) => { e.preventDefault(); guard(async () => { await api.sendOtp(f.email); setStep('code'); }); };
  const verify = (e: FormEvent) => { e.preventDefault(); guard(async () => { await api.verifyOtp(f.email, code); setStep('details'); }); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    guard(async () => {
      const common = { first_name: f.first_name, last_name: f.last_name, title: f.title, phone: f.phone, date_of_birth: f.date_of_birth || null };
      if (person) {
        const body: Record<string, unknown> = { ...common, department_id: f.department_id === '' ? null : f.department_id };
        if (f.role !== person.role) body.role = f.role;
        if (f.password) body.password = f.password;
        await api.updateUser(person.id, body);
      } else {
        const res = await api.createUser({ ...common, email: f.email, password: f.password, role: f.role });
        if (f.department_id !== '') await api.updateUser(res.data.id, { department_id: f.department_id });
      }
      onSaved();
    });
  };

  return (
    <Modal title={person ? `Edit ${fullName(person)}` : 'Add person'} onClose={onClose}>
      <ErrorBox text={error} />
      {step === 'email' && (
        <form onSubmit={sendCode} className="mt-3 space-y-4">
          <p className="text-sm text-slate-600">We'll email a 6-digit code to confirm the address is real.</p>
          <Field label="Email"><input className={inputCls} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Send code</Button></div>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={verify} className="mt-3 space-y-4">
          <p className="text-sm text-slate-600">Enter the code sent to <strong>{f.email}</strong>. It expires in 10 minutes.</p>
          <Field label="6-digit code"><input className={inputCls} inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep('email')}>Back</Button>
            <Button type="submit" busy={busy}>Verify</Button>
          </div>
        </form>
      )}
      {step === 'details' && (
        <form onSubmit={submit} className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
          </div>
          {!person && <p className="text-sm text-slate-500">{f.email}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select className={inputCls} disabled={isSelf} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Date of birth"><input className={inputCls} type="date" value={f.date_of_birth ?? ''} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></Field>
          </div>
          <Field label={person ? 'New password (leave blank to keep)' : 'Temporary password'}>
            <input className={inputCls} type="password" autoComplete="new-password" required={!person} minLength={person && !f.password ? undefined : 8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Save</Button></div>
        </form>
      )}
    </Modal>
  );
}
