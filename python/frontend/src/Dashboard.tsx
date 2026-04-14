import { useEffect, useState } from 'react';
import { api } from './api';
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users,
  LogOut, Bell, LayoutGrid, ChevronRight, Menu, X,
  ClipboardList, UserCircle, ArrowLeft, Sun, Moon
} from 'lucide-react';
import OverviewPage from './pages/OverviewPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import TeamPage from './pages/TeamPage';
import KanjiBoardPage from './pages/KanbanPage';
import MyTasksPage from './pages/user/MyTasksPage';
import NotificationsPage from './pages/user/NotificationsPage';
import ProfilePage from './pages/user/ProfilePage';
import TimesheetsPage from './pages/TimesheetsPage';
import CyclesPage from './pages/CyclesPage';
import { Clock3, CalendarRange } from 'lucide-react';

type Page = 'overview' | 'projects' | 'tasks' | 'team' | 'kanban' | 'my_tasks' | 'notifications' | 'profile' | 'timesheets' | 'cycles';

const ADMIN_NAV = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'cycles', label: 'Sprints / Cycles', icon: <CalendarRange className="w-5 h-5" /> },
  { id: 'tasks', label: 'Work Items', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'kanban', label: 'Kanban Board', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'team', label: 'Team Members', icon: <Users className="w-5 h-5" /> },
  { id: 'timesheets', label: 'Timesheets', icon: <Clock3 className="w-5 h-5" /> },
];

const USER_NAV = [
  { id: 'my_tasks', label: 'My Tasks', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-5 h-5" /> },
];

const ADMIN_ROLES = ['admin', 'team_head', 'project_manager'];

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('overview');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [me, setMe] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<Page[]>([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    api.getMe().then(r => {
      setMe(r.data);
      const isAdmin = r.data.is_superuser || ADMIN_ROLES.includes(r.data.role);
      setPage(isAdmin ? 'overview' : 'my_tasks');
    }).catch(() => {});
    api.getNotifications().then(r => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUnreadCount(r.data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, []);

  const isAdmin = me?.is_superuser || ADMIN_ROLES.includes(me?.role);
  const isStrictAdmin = me?.is_superuser || me?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV.filter(item => {
    // PMs cannot see global Team Members settings
    if (item.id === 'team' && !isStrictAdmin) return false;
    // Timesheets are usually okay, but we can leave them for PMs as they manage tasks.
    return true;
  }) : USER_NAV;



  const getPageLabel = (id: string) => {
    return [...ADMIN_NAV, ...USER_NAV].find(n => n.id === id)?.label || id;
  };

  const navItemClass = (id: string) =>
    `flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm relative ${
      page === id
        ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
        : 'text-text-muted hover:bg-surface/70 hover:text-text border border-transparent'
    }`;

  const handleNav = (id: Page, pushHistory = true) => { 
    if (pushHistory && id !== page) setHistory(prev => [...prev, page]);
    setPage(id); 
    setSidebarOpen(false); 
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(prevStack => prevStack.slice(0, -1));
    handleNav(prev, false);
  };

  return (
    <div className="h-screen bg-background text-text flex overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen w-64 z-30 flex flex-col border-r border-border glass transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <button onClick={() => handleNav(isAdmin ? 'overview' : 'my_tasks')} className="flex items-center gap-3">
              <img 
                src="/colour parrot-icon.webp" 
                alt="Logo" 
                className="h-14 w-auto max-w-[4rem] object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] flex-shrink-0 -ml-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = document.getElementById('dash-fallback-logo');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div id="dash-fallback-logo" className="hidden w-10 h-10 bg-gradient-to-br from-primary to-[#8b5cf6] rounded-xl items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)] flex-shrink-0">
                <span className="font-black text-white text-sm">CP</span>
              </div>
              <div className="text-left">
                <p className="font-black text-base bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#8b5cf6]">Colour Parrot</p>
                <p className="text-xs text-text-muted capitalize">{me?.role?.replace('_', ' ') || 'Loading...'}</p>
              </div>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-text-muted hover:text-text">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isAdmin && (
            <>
              <p className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider mb-2 px-1">Admin</p>
              {navItems.map(item => (
                <button key={item.id} onClick={() => handleNav(item.id as Page)} className={navItemClass(item.id)}>
                  {item.icon} {item.label}
                  {page === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
              <p className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider mt-4 mb-2 px-1">My Account</p>
            </>
          )}
          {USER_NAV.map(item => (
            <button key={item.id} onClick={() => handleNav(item.id as Page)} className={navItemClass(item.id)}>
              {item.icon}
              {item.label}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
              {page === item.id && item.id !== 'notifications' && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border/50">
          {me && (
            <button onClick={() => handleNav('profile')} className="w-full flex items-center gap-3 px-3 py-3 glass rounded-xl border border-border/50 mb-3 hover:border-primary/30 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {me.first_name ? me.first_name.charAt(0) : me.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{me.first_name ? `${me.first_name} ${me.last_name || ''}`.trim() : 'My Profile'}</p>
                <p className="text-xs text-text-muted truncate">{me.email}</p>
              </div>
            </button>
          )}
          <button onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 rounded-xl font-medium transition-all group border border-transparent hover:border-red-500/20 text-sm">
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-10 border-b border-border/50 glass px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-text-muted hover:text-text glass border border-border rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              {history.length > 0 && (
                <button onClick={goBack} className="p-2 text-text-muted hover:text-primary glass border border-border rounded-lg transition-all flex items-center gap-1 group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-bold hidden lg:block">Back</span>
                </button>
              )}
              <div>
                <h2 className="font-bold text-lg">{getPageLabel(page)}</h2>
                <p className="text-xs text-text-muted hidden sm:block">Colour Parrot — Digital Advertising Agency</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 text-text-muted hover:text-primary glass border border-border rounded-xl transition-all"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-primary" />}
            </button>
            <button onClick={() => handleNav('notifications')} className="relative p-2.5 glass border border-border hover:border-primary/50 rounded-xl text-text-muted hover:text-primary transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => handleNav('profile')} className="p-2.5 glass border border-border hover:border-primary/50 rounded-xl text-text-muted hover:text-primary transition-colors">
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#8b5cf6] opacity-5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary opacity-5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            {page === 'overview' && <OverviewPage onNavigate={(p: any) => handleNav(p)} />}
            {page === 'projects' && <ProjectsPage />}
            {page === 'cycles' && <CyclesPage />}
            {page === 'tasks' && <TasksPage />}
            {page === 'kanban' && <KanjiBoardPage />}
            {page === 'team' && <TeamPage />}
            {page === 'timesheets' && <TimesheetsPage />}
            {page === 'my_tasks' && <MyTasksPage />}
            {page === 'notifications' && <NotificationsPage />}
            {page === 'profile' && <ProfilePage />}
          </div>
        </main>
      </div>
    </div>
  );
}
