import { useEffect, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import {
  Bell, CalendarDays, CheckSquare, Clock, FolderKanban, LayoutDashboard, LogOut, Menu, Settings, User as UserIcon, Users,
} from 'lucide-react';
import { api, errorMessage, fullName, ROLE_LABELS, type Role } from './api';
import { AuthProvider, useAuth } from './auth';
import { Button, ErrorBox, Field, Spinner, cx, inputCls } from './ui';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';
import StrategyPage from './pages/StrategyPage';
import TeamPage from './pages/TeamPage';
import TimesheetsPage from './pages/TimesheetsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            : errorMessage(err, 'Cannot reach the server. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="text-center">
          <img src="/colour parrot-icon.webp" alt="" className="mx-auto mb-3 h-14 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-xl font-semibold">Colour Parrot</h1>
          <p className="text-sm text-slate-500">Sign in to your workspace</p>
        </div>
        <ErrorBox text={error} />
        <Field label="Email">
          <input className={inputCls} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" busy={busy} className="w-full">Sign in</Button>
      </form>
    </div>
  );
}

interface NavItem { to: string; label: string; icon: typeof Menu; roles?: Role[] }

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/plan', label: 'Content plan', icon: CalendarDays, roles: ['admin', 'project_manager', 'sales_manager', 'team_head', 'specialist'] },
  { to: '/timesheets', label: 'Timesheets', icon: Clock },
  { to: '/team', label: 'Team', icon: Users, roles: ['admin', 'hr', 'project_manager', 'team_head', 'sales_manager'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'project_manager', 'sales_manager'] },
];

function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const poll = () => api.notifications().then((n) => alive && setUnread(n.filter((x) => !x.read).length)).catch(() => undefined);
    poll();
    const t = setInterval(poll, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!user) return null;
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const link = ({ isActive }: { isActive: boolean }) =>
    cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-100');

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-6 px-2 text-lg font-semibold text-brand">Colour Parrot</div>
        <nav className="flex-1 space-y-1" onClick={() => setOpen(false)}>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-200 pt-3" onClick={() => setOpen(false)}>
          <NavLink to="/notifications" className={link}>
            <Bell className="h-4 w-4" /> Notifications
            {unread > 0 && <span className="ml-auto rounded-full bg-red-600 px-1.5 text-xs text-white">{unread}</span>}
          </NavLink>
          <NavLink to="/profile" className={link}>
            <UserIcon className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate">{fullName(user)}<span className="block text-xs font-normal text-slate-400">{ROLE_LABELS[user.role]}</span></span>
          </NavLink>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="font-semibold text-brand">Colour Parrot</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Login />;
  const planners: Role[] = ['admin', 'project_manager', 'sales_manager', 'team_head', 'specialist'];
  const team: Role[] = ['admin', 'hr', 'project_manager', 'team_head', 'sales_manager'];
  const settings: Role[] = ['admin', 'project_manager', 'sales_manager'];
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="plan" element={<Guard roles={planners}><StrategyPage /></Guard>} />
        <Route path="timesheets" element={<TimesheetsPage />} />
        <Route path="team" element={<Guard roles={team}><TeamPage /></Guard>} />
        <Route path="settings" element={<Guard roles={settings}><SettingsPage /></Guard>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
