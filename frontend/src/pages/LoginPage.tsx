import { useState, type FormEvent } from 'react';
import { CalendarDays, CheckSquare, Clock, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { errorMessage } from '../api';
import { useAuth } from '../auth';
import { Button, ErrorBox, inputCls } from '../ui';

const POINTS = [
  { icon: CheckSquare, text: 'Every task, client and deadline in one place' },
  { icon: CalendarDays, text: 'Content plans your whole team can follow' },
  { icon: Clock, text: 'Timesheets and monthly backups, done for you' },
];

/** Sign-in screen: brand panel on wide screens, just the form on phones. */
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(
        status === 401 ? 'Wrong email or password.'
          : status === 429 ? 'Too many attempts. Please wait a minute and try again.'
            : !status ? 'Cannot reach the server. It may be waking up, so wait 30 seconds and try again.'
              : errorMessage(err, 'Something went wrong. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-700 via-green-800 to-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
            <img src="/colour%20parrot-icon.png" alt="" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </span>
          <span className="text-xl font-semibold">Colour Parrot</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight">Run every client project from one simple screen.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-green-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><p.icon className="h-5 w-5" /></span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-green-100/70">Task management for the Colour Parrot team</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft p-1.5">
              <img src="/colour%20parrot-icon.png" alt="" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </span>
            <span className="text-lg font-semibold text-brand">Colour Parrot</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mb-6 mt-1 text-slate-500">Sign in to see your work for today.</p>

          <div className="space-y-4">
            <ErrorBox text={error} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className={inputCls + ' py-2.5 pl-9'} type="email" autoComplete="username" placeholder="you@company.com" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className={inputCls + ' py-2.5 pl-9 pr-10'} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            <Button type="submit" busy={busy} className="w-full py-2.5 text-base">Sign in</Button>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Forgot your password? Ask your admin to reset it.</p>
        </form>
      </main>
    </div>
  );
}
