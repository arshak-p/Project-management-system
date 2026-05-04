import { useEffect, useState, lazy, Suspense } from 'react';
import { api } from './api';
import type { User } from './api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users,
  LogOut, Bell, LayoutGrid, Menu, X,
  ClipboardList, UserCircle, ArrowLeft, Sun, Moon,
  Clock3, CalendarRange, Activity, Map as MapIcon, BrainCircuit, ShieldCheck, Download, Layers, Workflow,
  Loader2
} from 'lucide-react';

// Lazy Load Pages for Performance
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const MyTasksPage = lazy(() => import('./pages/user/MyTasksPage'));
const NotificationsPage = lazy(() => import('./pages/user/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage'));
const CyclesPage = lazy(() => import('./pages/CyclesPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const JobTitlesPage = lazy(() => import('./pages/JobTitlesPage'));
const AgencyRoadmap = lazy(() => import('./pages/AgencyRoadmap'));
const TaskCalendarPage = lazy(() => import('./pages/TaskCalendarPage'));
const StrategistPage = lazy(() => import('./pages/StrategistPage'));
const TeamIntelligencePage = lazy(() => import('./pages/TeamIntelligencePage'));
const BackupsPage = lazy(() => import('./pages/BackupsPage'));
const ModulesPage = lazy(() => import('./pages/ModulesPage'));
const TeamHeadDashboard = lazy(() => import('./pages/TeamHeadDashboard'));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'));
import { getWsUrl } from './config';

type Page = 'overview' | 'projects' | 'tasks' | 'team' | 'kanban' | 'my_tasks' | 'notifications' | 'profile' | 'timesheets' | 'cycles' | 'activity' | 'job_titles' | 'roadmap' | 'calendar' | 'strategist' | 'intelligence' | 'backups' | 'modules' | 'workflow';

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
  { id: 'workflow', label: 'Task Workflow', icon: <Workflow className="w-5 h-5" /> },
  { id: 'roadmap', label: 'Agency Roadmap', icon: <MapIcon className="w-5 h-5" /> },
  { id: 'backups', label: 'Data Backups', icon: <Download className="w-5 h-5" /> },
];

const USER_NAV = [
  { id: 'my_tasks', label: 'My Tasks', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'kanban', label: 'My Board', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
];

const TEAM_HEAD_NAV = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'tasks', label: 'Team Tasks', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'kanban', label: 'Team Board', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'intelligence', label: 'My Team', icon: <Users className="w-5 h-5" /> },
  { id: 'my_tasks', label: 'My Tasks', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
];

const HR_NAV = [
  { id: 'team', label: 'Team Members', icon: <Users className="w-5 h-5" /> },
  { id: 'intelligence', label: 'Team Info', icon: <ShieldCheck className="w-5 h-5" /> },
  { id: 'job_titles', label: 'Job Titles', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserCircle className="w-5 h-5" /> },
];

const ADMIN_ROLES = ['admin', 'project_manager'];
const TEAM_HEAD_ROLES = ['team_head'];
const HR_ROLES = ['hr'];

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('overview');
  const [me, setMe] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [isNotifyPaused, setIsNotifyPaused] = useState(false);
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
      const isTH = TEAM_HEAD_ROLES.includes(r.data.role || '');
      const isHR = HR_ROLES.includes(r.data.role || '');
      
      if (isHR && page === 'overview') setPage('team');
      else if (!isA && !isTH && !isHR && page === 'overview') setPage('my_tasks');
    }).catch(() => onLogout());
  }, []);

  useEffect(() => {
    // Request permission for Desktop Notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const hb = setInterval(() => {
       api.getNotifications().then(r => {
         const all = r.data.filter((n: any) => !n.read);
         setUnreadCount(all.length);
         setNotifications(prev => {
           const top3 = all.slice(0, 3);
           if (prev.length === top3.length && prev.every((p, i) => p.id === top3[i].id)) return prev;
           return top3;
         });
       });
    }, 5000); 
    return () => clearInterval(hb);
  }, []);

  // Global Auto-dismiss with Hover Pause
  useEffect(() => {
    if (isNotifyPaused) return;

    const visible = notifications.filter(n => !dismissedIds.includes(n.id));
    if (visible.length === 0) return;

    const timers = visible.map(n => {
      return setTimeout(() => {
        setDismissedIds(prev => [...new Set([...prev, n.id])]);
      }, 6000);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [notifications, dismissedIds, isNotifyPaused]);

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

    ws.onopen = () => {
      // Send heartbeat every 30 seconds to update 'last_active'
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);
      ws._heartbeatInterval = interval;
    };

    ws.onerror = () => console.warn("Notification Socket error. Retrying in background.");
    
    return () => {
      if (ws._heartbeatInterval) clearInterval(ws._heartbeatInterval);
      ws.close();
    };
  }, []);

  const isAdmin = me?.is_superuser || ADMIN_ROLES.includes(me?.role || '');
  const isTeamHead = TEAM_HEAD_ROLES.includes(me?.role || '');
  const isHR = HR_ROLES.includes(me?.role || '');
  
  let navItems = USER_NAV;
  if (isAdmin) navItems = ADMIN_NAV;
  else if (isTeamHead) navItems = TEAM_HEAD_NAV;
  else if (isHR) navItems = HR_NAV;

  // Guard: Do not render the dashboard body until the user profile is securely loaded
  if (!me) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-40 mt-8">Decrypting Clearance...</p>
      </div>
    );
  }

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
      className="h-screen w-full bg-background text-text block md:flex overflow-hidden font-inter relative"
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
        fixed md:sticky top-0 h-[calc(100vh-2rem)] w-72 lg:w-80 z-50 flex flex-col m-4 rounded-[2.5rem] glass border-white/5 shadow-premium transition-transform duration-500
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] md:translate-x-0'}
      `}>
        <div className="p-10 flex items-center justify-between">
          <button onClick={() => { handleNav((isAdmin || isTeamHead) ? 'overview' : 'my_tasks'); setSidebarOpen(false); }} className="flex items-center gap-6 group">
            <div className="relative">
               <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full group-hover:bg-primary/50 transition-all"></div>
               <img src="/colour parrot-icon.png" alt="Logo" className="relative h-16 w-auto animate-float" />
            </div>
            <div className="text-left">
              <p className="font-black text-2xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#d946ef]">C-Parrot</p>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-text-muted mt-3 opacity-60">Management</p>
            </div>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-3 glass rounded-xl text-text-muted hover:text-white transition-all ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <motion.button 
              key={item.id} 
              onClick={() => { handleNav(item.id as Page); setSidebarOpen(false); }} 
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

        <div className="flex-1 flex flex-col w-screen md:w-auto min-w-0 md:min-w-0 bg-background overflow-hidden relative">
        <header className="h-16 md:h-24 flex items-center justify-between px-2 md:px-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-3 glass rounded-2xl">
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
            <button 
              onClick={() => handleNav('notifications')}
              className="relative p-3 glass rounded-full hover:border-primary/50 transition-all text-text-muted hover:text-white group flex items-center justify-center"
            >
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute top-[6px] right-[6px] w-[10px] h-[10px] bg-rose-500 rounded-full border-2 border-background animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              )}
            </button>
            {me && (
              <button onClick={() => handleNav('profile')} className="flex items-center gap-4 p-1 pl-6 pr-1 glass rounded-full hover:border-primary/50 transition-all border border-white/5">
                <div className="flex flex-col items-end">
                  <p className="text-[11px] font-black tracking-tight uppercase text-white/90">{me.first_name || 'User'}</p>
                  <span className="text-[7px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20 leading-none">
                    {me.role?.replace('_', ' ') || 'Specialist'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center text-white text-xs font-black shadow-glow-sm">
                  {me.first_name?.[0] || '?' }
                </div>
              </button>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto px-4 md:px-10 pb-24 md:pb-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
             <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                >
                  <Suspense fallback={
                    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                        <Loader2 className="w-10 h-10 text-primary animate-spin relative" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted opacity-40">Loading Intelligence...</p>
                    </div>
                  }>
                    {page === 'overview' && (isTeamHead ? <TeamHeadDashboard me={me} /> : <OverviewPage onNavigate={(p: string) => handleNav(p as Page)} me={me} />)}
                    {page === 'projects' && <ProjectsPage onNavigate={(p: string) => handleNav(p as Page)} me={me} />}
                    {page === 'tasks' && <TasksPage me={me} />}
                    {page === 'cycles' && <CyclesPage me={me} />}
                    {page === 'modules' && <ModulesPage me={me} />}
                    {page === 'workflow' && <WorkflowPage me={me} />}
                    {page === 'backups' && <BackupsPage me={me} />}
                    {page === 'kanban' && <KanbanPage me={me} />}
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
                    {page === 'roadmap' && <AgencyRoadmap me={me} />}
                  </Suspense>
                </motion.div>
             </AnimatePresence>
          </div>
        </main>

        {/* Mobile/Tablet Bottom Navigation */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 glass border-white/10 rounded-[2rem] px-4 py-3 flex justify-around items-center shadow-2xl backdrop-blur-2xl">
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
        {/* Global Notifications Container */}
        <div 
          className="fixed bottom-6 right-6 md:top-24 md:bottom-auto md:right-8 z-[200] flex flex-col gap-3 w-[calc(100%-3rem)] md:w-80 pointer-events-none"
          onMouseEnter={() => setIsNotifyPaused(true)}
          onMouseLeave={() => setIsNotifyPaused(false)}
        >
          <AnimatePresence>
            {notifications.filter(n => !dismissedIds.includes(n.id)).map(n => (
              <motion.div 
                key={n.id} 
                initial={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 20, scale: 0.9, filter: 'blur(10px)' }}
                className="glass p-4 rounded-[1.5rem] border border-white/10 shadow-glow-lg pointer-events-auto cursor-pointer group relative overflow-hidden backdrop-blur-3xl"
                onClick={() => handleNav('notifications')}
              >
                 <div className="absolute top-0 left-0 w-1 h-full bg-primary/60"></div>
                 <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                       <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                         <h4 className="text-[11px] font-black uppercase tracking-wider text-white">{n.title}</h4>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setDismissedIds(prev => [...new Set([...prev, n.id])]);
                           }}
                           className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white"
                         >
                           <X className="w-3.5 h-3.5" />
                         </button>
                      </div>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-bold opacity-80">{n.body}</p>
                    </div>
                 </div>
                 {/* Progress Bar for Auto-dismiss */}
                 {!isNotifyPaused && (
                   <motion.div 
                     initial={{ scaleX: 1 }}
                     animate={{ scaleX: 0 }}
                     transition={{ duration: 6, ease: "linear" }}
                     className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20 origin-left"
                   />
                 )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}


