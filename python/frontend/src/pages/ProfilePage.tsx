import { useState, type FormEvent } from 'react';
import { api, errorMessage, ROLE_LABELS } from '../api';
import { useAuth } from '../auth';
import { Button, Card, ErrorBox, Field, PageHeader, inputCls } from '../ui';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [f, setF] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', phone: user?.phone ?? '' });
  const [pw, setPw] = useState({ old: '', next: '' });
  const [msg, setMsg] = useState({ profile: '', password: '' });
  const [err, setErr] = useState({ profile: '', password: '' });

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setErr((x) => ({ ...x, profile: '' }));
    try {
      await api.updateMe(f);
      await refreshUser();
      setMsg((m) => ({ ...m, profile: 'Saved.' }));
    } catch (error) {
      setErr((x) => ({ ...x, profile: errorMessage(error) }));
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErr((x) => ({ ...x, password: '' }));
    try {
      await api.changePassword(pw.old, pw.next);
      setPw({ old: '', next: '' });
      setMsg((m) => ({ ...m, password: 'Password updated.' }));
    } catch (error) {
      setErr((x) => ({ ...x, password: errorMessage(error) }));
    }
  };

  return (
    <>
      <PageHeader title="My profile" subtitle={`${user.email} · ${ROLE_LABELS[user.role]}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <form onSubmit={saveProfile} className="space-y-4">
            <h2 className="font-medium">Details</h2>
            <ErrorBox text={err.profile} />
            {msg.profile && <p className="text-sm text-green-700">{msg.profile}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input className={inputCls} value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
              <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
            </div>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Button type="submit">Save</Button>
          </form>
        </Card>
        <Card className="p-5">
          <form onSubmit={savePassword} className="space-y-4">
            <h2 className="font-medium">Change password</h2>
            <ErrorBox text={err.password} />
            {msg.password && <p className="text-sm text-green-700">{msg.password}</p>}
            <Field label="Current password"><input className={inputCls} type="password" autoComplete="current-password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></Field>
            <Field label="New password"><input className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Button type="submit">Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
