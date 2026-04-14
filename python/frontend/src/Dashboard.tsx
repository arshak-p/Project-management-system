import { useEffect, useState } from 'react';
import { api } from './api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users,
  LogOut, Bell, LayoutGrid, Menu, X,
  ClipboardList, UserCircle, ArrowLeft, Sun, Moon,
  Clock3, CalendarRange, Activity
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
import ActivityPage from './pages/ActivityPage';

type Page = 'overview' | 'projects' | 'tasks' | 'team' | 'kanban' | 'my_tasks' | 'notifications' | 'profile' | 'timesheets' | 'cycles' | 'activity';

const ADMIN_NAV = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'cycles', label: 'Cycles', icon: <CalendarRange className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'kanban', label: 'Kanban Board', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'team', label: 'Team', icon: <Users className="w-5 h-5" /> },
  { id: 'timesheets', label: 'Timesheets', icon: <Clock3 className="w-5 h-5" /> },
  { id: 'activity', label: 'Activity Log', icon: <Activity className="w-5 h-5" /> },
];

const USER_NAV = [
  { id: 'my_tasks', label: 'My Tasks', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
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
      const isA = r.data.is_superuser || ADMIN_ROLES.includes(r.data.role);
      if (!isA && page === 'overview') setPage('my_tasks');
    }).catch(() => onLogout());
    
    const hb = setInterval(() => {
       api.getNotifications().then(r => {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const newData = r.data.filter((n: any) => !n.read);
         setUnreadCount(newData.length);
       });
    }, 30000);
    return () => clearInterval(hb);
  }, []);

  const isAdmin = me?.is_superuser || ADMIN_ROLES.includes(me?.role);
  const isStrictAdmin = me?.is_superuser || me?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV.filter(item => (item.id !== 'team' || isStrictAdmin)) : USER_NAV;

  const handleNav = (newPage: Page, pushHistory = true) => {
    if (pushHistory && page !== newPage) setHistory(prev => [...prev.slice(-10), page]);
    setPage(newPage);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const navItemClass = (id: string) => `
    flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all relative group mb-2
    ${page === id 
      ? 'glass text-primary shadow-glow border-primary/20 scale-105' 
      : 'text-text-muted hover:text-text hover:bg-white/5'}
  `;

  return (
    <div className="h-screen bg-background text-text flex overflow-hidden font-inter">
       <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-md" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:sticky top-0 h-[calc(100vh-2rem)] w-80 z-50 flex flex-col m-4 rounded-[2.5rem] glass border-white/5 transition-transform duration-500
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center justify-between">
          <button onClick={() => handleNav(isAdmin ? 'overview' : 'my_tasks')} className="flex items-center gap-5 group">
            <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-all"></div>
               <img src="/colour parrot-icon.webp" alt="Logo" className="relative h-12 w-auto animate-float" />
            </div>
            <div className="text-left">
              <p className="font-black text-xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#d946ef]">C-Parrot</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mt-2 opacity-50">Management System</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => handleNav(item.id as Page)} className={navItemClass(item.id)}>
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-glow">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-3">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold text-text-muted hover:text-text hover:bg-white/5 transition-all">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} Mode Shift
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold text-error border border-error/10 hover:bg-error/10 transition-all">
            <LogOut className="w-5 h-5" /> De-Authorize
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <header className="h-24 flex items-center justify-between px-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 glass rounded-2xl">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
               {history.length > 0 && (
                 <button onClick={() => {
                   const h = [...history];
                   const prev = h.pop();
                   setHistory(h);
                   if (prev) handleNav(prev, false);
                 }} className="p-3 glass rounded-2xl hover:text-primary transition-all">
                   <ArrowLeft className="w-4 h-4" />
                 </button>
               )}
               <h2 className="font-black text-xs text-text-muted uppercase tracking-[0.4em] opacity-40 italic">{page}</h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {me && (
              <button onClick={() => handleNav('profile')} className="flex items-center gap-4 p-2 pl-6 glass rounded-full hover:border-primary/50 transition-all">
                <p className="text-xs font-black tracking-tight uppercase opacity-60">{me.first_name || 'Operator'}</p>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center text-white text-xs font-black shadow-glow">
                  {me.first_name?.[0] || '?' }
                </div>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
             <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                >
                  {page === 'overview' && <OverviewPage onNavigate={(p: any) => handleNav(p)} />}
                  {page === 'projects' && <ProjectsPage onNavigate={(p: any) => handleNav(p)} />}
                  {page === 'cycles' && <CyclesPage />}
                  {page === 'tasks' && <TasksPage />}
                  {page === 'kanban' && <KanjiBoardPage />}
                  {page === 'team' && <TeamPage />}
                  {page === 'timesheets' && <TimesheetsPage />}
                  {page === 'my_tasks' && <MyTasksPage />}
                  {page === 'notifications' && <NotificationsPage />}
                  {page === 'profile' && <ProfilePage />}
                  {page === 'activity' && <ActivityPage />}
                </motion.div>
             </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}


