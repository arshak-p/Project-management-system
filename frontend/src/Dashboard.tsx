import { useEffect, useState } from 'react';
import { api } from './api';
import type { User } from './api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users,
  LogOut, Bell, LayoutGrid, Menu,
  ClipboardList, UserCircle, ArrowLeft, Sun, Moon,
  Clock3, CalendarRange, Activity, Map as MapIcon, BrainCircuit, ShieldCheck, Download, Layers
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
import JobTitlesPage from './pages/JobTitlesPage';
import AgencyRoadmap from './pages/AgencyRoadmap';
import TaskCalendarPage from './pages/TaskCalendarPage';
import StrategistPage from './pages/StrategistPage';
import TeamIntelligencePage from './pages/TeamIntelligencePage';
import BackupsPage from './pages/BackupsPage';
import ModulesPage from './pages/ModulesPage';
import { getWsUrl } from './config';

type Page = 'overview' | 'projects' | 'tasks' | 'team' | 'kanban' | 'my_tasks' | 'notifications' | 'profile' | 'timesheets' | 'cycles' | 'activity' | 'job_titles' | 'roadmap' | 'calendar' | 'strategist' | 'intelligence' | 'backups' | 'modules';

interface Notification {
  id: number;
  read: boolean;
}

const ADMIN_NAV = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'cycles', label: 'Cycles', icon: <CalendarRange className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'kanban', label: 'Kanban Board', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'team', label: 'Team', icon: <Users className="w-5 h-5" /> },
  { id: 'timesheets', label: 'Timesheets', icon: <Clock3 className="w-5 h-5" /> },
  { id: 'activity', label: 'Activity Log', icon: <Activity className="w-5 h-5" /> },
  { id: 'calendar', label: 'Task Calendar', icon: <CalendarRange className="w-5 h-5" /> },
  { id: 'strategist', label: 'Planning', icon: <BrainCircuit className="w-5 h-5" /> },
  { id: 'intelligence', label: 'Team Info', icon: <ShieldCheck className="w-5 h-5" /> },
  { id: 'job_titles', label: 'Job Titles', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'modules', label: 'Task Modules', icon: <Layers className="w-5 h-5" /> },
  { id: 'roadmap', label: 'Agency Roadmap', icon: <MapIcon className="w-5 h-5" /> },
  { id: 'backups', label: 'Data Backups', icon: <Download className="w-5 h-5" /> },
];

const USER_NAV = [
  { id: 'my_tasks', label: 'My Tasks', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
];


const ADMIN_ROLES = ['admin', 'team_head', 'project_manager'];

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('overview');
  const [me, setMe] = useState<User | null>(null);
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
      const isA = r.data.is_superuser || ADMIN_ROLES.includes(r.data.role || '');
      if (!isA && page === 'overview') setPage('my_tasks');
    }).catch(() => onLogout());
  }, [onLogout, page]);

  useEffect(() => {
    // Request permission for Desktop Notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const hb = setInterval(() => {
       api.getNotifications().then(r => {
         const newData = r.data.filter((n: Notification) => !n.read);
         setUnreadCount(newData.length);
       });
    }, 30000);
    return () => clearInterval(hb);
  }, []);

  useEffect(() => {
    // Real-time Notification Socket
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = getWsUrl('/ws/notifications/');
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'notification') {
          const { title, body } = payload.data;
          
          // Show Browser Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`CP: ${title}`, {
              body,
              icon: '/colour parrot-icon.png'
            });
          }

          // Increment unread count locally
          setUnreadCount(prev => prev + 1);
        }
      } catch (err) {
        console.error("Notification WS Error", err);
      }
    };

    ws.onerror = () => console.warn("Notification Socket error. Retrying in background.");
    
    return () => ws.close();
  }, []);

  const isAdmin = me?.is_superuser || ADMIN_ROLES.includes(me?.role || '');
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

  const handleNav = (newPage: Page, pushHistory = true) => {
    if (pushHistory && page !== newPage) setHistory(prev => [...prev.slice(-10), page]);
    setPage(newPage);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const navItemClass = (id: string) => `
    flex items-center gap-4 px-6 py-3.5 rounded-[1.25rem] text-sm font-bold transition-all duration-300 relative group mb-1
    ${page === id 
      ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' 
      : 'text-text-muted hover:text-text hover:bg-[var(--nav-hover)]'}
  `;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="h-screen bg-background text-text flex overflow-hidden font-inter"
    >
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
        fixed lg:sticky top-0 h-[calc(100vh-2rem)] w-80 z-50 flex flex-col m-4 rounded-[2.5rem] glass border-white/5 shadow-premium transition-transform duration-500
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center justify-between">
          <button onClick={() => handleNav(isAdmin ? 'overview' : 'my_tasks')} className="flex items-center gap-6 group">
            <div className="relative">
               <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full group-hover:bg-primary/50 transition-all"></div>
               <img src="/colour parrot-icon.png" alt="Logo" className="relative h-16 w-auto animate-float" />
            </div>
            <div className="text-left">
              <p className="font-black text-2xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#d946ef]">C-Parrot</p>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-text-muted mt-3 opacity-60">Management</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <motion.button 
              key={item.id} 
              onClick={() => handleNav(item.id as Page)} 
              className={navItemClass(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {page === item.id && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute left-0 w-1.5 h-6 bg-primary rounded-r-full shadow-[0_0_15px_var(--primary)]"
                />
              )}
              <span className={`transition-colors duration-300 ${page === item.id ? 'text-primary' : 'group-hover:text-primary'}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-glow">
                  {unreadCount}
                </span>
              )}
            </motion.button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 bg-black/10 rounded-b-[2.5rem]">
          <motion.button 
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold text-text-muted hover:text-text hover:bg-white/5 transition-all mb-2"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-primary" />} 
            Dark / Light Mode
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogout} 
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold text-error bg-error/5 border border-error/10 hover:bg-error/10 transition-all shadow-sm"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </motion.button>
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
                <p className="text-xs font-black tracking-tight uppercase opacity-60">{me.first_name || 'User'}</p>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center text-white text-xs font-black shadow-glow">
                  {me.first_name?.[0] || '?' }
                </div>
              </button>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto px-6 lg:px-10 pb-24 lg:pb-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
             <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                >
                  {page === 'overview' && <OverviewPage onNavigate={(p: string) => handleNav(p as Page)} me={me} />}
                  {page === 'projects' && <ProjectsPage onNavigate={(p: string) => handleNav(p as Page)} me={me} />}
                  {page === 'cycles' && <CyclesPage me={me} />}
                  {page === 'tasks' && <TasksPage me={me} />}
                  {page === 'kanban' && <KanjiBoardPage me={me} />}
                  {page === 'team' && <TeamPage me={me} />}
                  {page === 'timesheets' && <TimesheetsPage me={me} />}
                  {page === 'my_tasks' && <MyTasksPage me={me} />}
                  {page === 'notifications' && <NotificationsPage me={me} />}
                  {page === 'profile' && <ProfilePage me={me} />}
                  {page === 'activity' && <ActivityPage me={me} />}
                  {page === 'calendar' && <TaskCalendarPage me={me} />}
                  {page === 'strategist' && <StrategistPage me={me} />}
                  {page === 'intelligence' && <TeamIntelligencePage me={me} />}
                  {page === 'job_titles' && <JobTitlesPage me={me} />}
                  { page === 'roadmap' && <AgencyRoadmap me={me} /> }
                  { page === 'backups' && <BackupsPage me={me} /> }
                  { page === 'modules' && <ModulesPage me={me} /> }
                </motion.div>
             </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 glass border-white/10 rounded-[2rem] px-4 py-3 flex justify-around items-center shadow-2xl backdrop-blur-2xl">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id as Page)}
              className={`p-3 rounded-2xl transition-all relative ${page === item.id ? 'text-primary bg-primary/10' : 'text-text-muted'}`}
            >
              {item.icon}
              {page === item.id && (
                <motion.div 
                  layoutId="mobileNavActive"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                />
              )}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-primary text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-3 text-text-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
        </nav>
      </div>
    </motion.div>
  );
}


