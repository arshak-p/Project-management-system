import { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderKanban, Users, LogOut, Bell, 
  Menu, Sun, Moon, ArrowLeft, Loader2, Calendar, 
  Briefcase, Boxes, Network, History, Database, Zap, BookOpen, Clock, Target, Star
} from 'lucide-react';
import { api } from './api';
import type { User } from './api';
import OverviewPage from './pages/OverviewPage';
import KanbanPage from './pages/KanbanPage';
import TasksPage from './pages/TasksPage';
import SpecialistDashboard from './pages/SpecialistDashboard';
import TeamPage from './pages/TeamPage';

// Lazy loading for secondary pages to keep the app lean
const TeamHeadDashboard = lazy(() => import('./pages/TeamHeadDashboard'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const CyclesPage = lazy(() => import('./pages/CyclesPage'));
const ModulesPage = lazy(() => import('./pages/ModulesPage'));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'));
const BackupsPage = lazy(() => import('./pages/BackupsPage'));
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage'));
const MyTasksPage = lazy(() => import('./pages/user/MyTasksPage'));
const NotificationsPage = lazy(() => import('./pages/user/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const TaskCalendarPage = lazy(() => import('./pages/TaskCalendarPage'));
const StrategistPage = lazy(() => import('./pages/StrategistPage'));
const TeamIntelligencePage = lazy(() => import('./pages/TeamIntelligencePage'));
const JobTitlesPage = lazy(() => import('./pages/JobTitlesPage'));
const AgencyRoadmap = lazy(() => import('./pages/AgencyRoadmap'));

type Page = 
  | 'overview' | 'projects' | 'tasks' | 'cycles' | 'modules' 
  | 'workflow' | 'backups' | 'kanban' | 'team' | 'timesheets' 
  | 'my_tasks' | 'notifications' | 'profile' | 'activity' | 'calendar'
  | 'strategist' | 'intelligence' | 'job_titles' | 'roadmap';

interface DashboardProps {
  onLogout: () => void;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [page, setPage] = useState<Page>('overview');
  const [history, setHistory] = useState<Page[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [me, setMe] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [isNotifyPaused, setIsNotifyPaused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedIds = useRef<Set<number>>(new Set());

  const isAdmin = me?.role === 'admin' || me?.role === 'agency_manager';
  const isTeamHead = me?.role === 'team_head';

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.getMe();
      setMe(res.data);
      // Redirect specialists to their specific view
      if (res.data.role === 'specialist' && page === 'overview') {
        setPage('my_tasks');
      }
    } catch (err) {
      console.error("Profile load failed", err);
    }
  }, [page]);

  const loadNotifications = useCallback(async () => {
    if (isNotifyPaused) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.read).length);

      if ('Notification' in window && Notification.permission === 'granted') {
        res.data.forEach((n: any) => {
          if (!n.read && !notifiedIds.current.has(n.id)) {
            new Notification(n.title || "New Notification", {
              body: n.body || "You have a new update in the Command Center."
            });
            notifiedIds.current.add(n.id);
          }
        });
      }
    } catch (err) {
      console.error("Notifications failed", err);
    }
  }, [isNotifyPaused]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    loadProfile();
    loadNotifications();
    const interval = setInterval(loadNotifications, 3000); // High Speed: 3s
    document.documentElement.setAttribute('data-theme', theme);
    return () => clearInterval(interval);
  }, [loadProfile, loadNotifications, theme]);

  // Auto-dismiss notifications after 5 seconds robustly
  const activeTimeouts = useRef<Record<number, any>>({});

  useEffect(() => {
    if (isNotifyPaused) {
      Object.values(activeTimeouts.current).forEach(clearTimeout);
      activeTimeouts.current = {};
      return;
    }
    
    notifications.forEach((n: any) => {
      if (!dismissedIds.includes(n.id) && !activeTimeouts.current[n.id]) {
        activeTimeouts.current[n.id] = setTimeout(() => {
          setDismissedIds(prev => {
            if (!prev.includes(n.id)) return [...prev, n.id];
            return prev;
          });
          delete activeTimeouts.current[n.id];
        }, 5000);
      }
    });

    // We do NOT clear timeouts on every render cleanup, so they actually complete
  }, [notifications, isNotifyPaused, dismissedIds]);

  // Clean up all timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(activeTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const handleNav = (target: Page, saveHistory = true) => {
    if (saveHistory && target !== page) {
      setHistory(prev => [...prev, page]);
    }
    setPage(target);
    setSidebarOpen(false);
  };

  const navItemClass = (id: Page) => `
    relative w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all group
    ${page === id ? 'text-primary' : 'text-text-muted hover:text-text hover:bg-white/5'}
  `;

  const navItems = [
    { id: 'overview', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', roles: ['admin', 'agency_manager', 'project_manager', 'team_head'] },
    { id: 'my_tasks', icon: <Target className="w-5 h-5" />, label: 'My Workspace', roles: ['specialist', 'team_head'] },
    { id: 'projects', icon: <Briefcase className="w-5 h-5" />, label: 'Projects', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr'] },
    { id: 'tasks', icon: <Boxes className="w-5 h-5" />, label: 'Tasks', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr'] },
    { id: 'cycles', icon: <Clock className="w-5 h-5" />, label: 'Cycles', roles: ['admin', 'agency_manager', 'project_manager', 'team_head'] },
    { id: 'kanban', icon: <FolderKanban className="w-5 h-5" />, label: 'Kanban Board', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr', 'specialist'] },
    { id: 'calendar', icon: <Calendar className="w-5 h-5" />, label: 'Calendar', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr', 'specialist'] },
    { id: 'team', icon: <Users className="w-5 h-5" />, label: 'Team', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr'] },
    { id: 'intelligence', icon: <Zap className="w-5 h-5" />, label: 'Team Intelligence', roles: ['admin', 'agency_manager', 'project_manager', 'team_head', 'hr'] },
    { id: 'timesheets', icon: <History className="w-5 h-5" />, label: 'Timesheets', roles: ['admin', 'agency_manager', 'project_manager', 'team_head'] },
    { id: 'activity', icon: <Clock className="w-5 h-5" />, label: 'Activity Log', roles: ['admin', 'agency_manager', 'project_manager'] },
    { id: 'workflow', icon: <Network className="w-5 h-5" />, label: 'Workflow', roles: ['admin', 'agency_manager'] },
    { id: 'strategist', icon: <Star className="w-5 h-5" />, label: 'Strategist', roles: ['admin', 'agency_manager'] },
    { id: 'roadmap', icon: <BookOpen className="w-5 h-5" />, label: 'Agency Roadmap', roles: ['admin', 'agency_manager'] },
    { id: 'backups', icon: <Database className="w-5 h-5" />, label: 'Backups', roles: ['admin', 'agency_manager'] },
  ].filter(item => !item.roles || (me && item.roles.includes(me.role)));

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="h-[111.11vh] w-[111.11vw] bg-background text-text block md:flex overflow-hidden font-inter relative"
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
        fixed md:sticky top-0 h-[calc(111.11vh-2rem)] w-72 lg:w-80 z-50 flex flex-col m-4 rounded-[2.5rem] glass border-white/5 shadow-premium transition-transform duration-500
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] md:translate-x-0'}
      `}>
        <div className="p-8 flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer shrink-0" onClick={() => handleNav((isAdmin || isTeamHead) ? 'overview' : 'my_tasks')}>
             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform shadow-glow">
                <img src="/colour parrot-icon.png" alt="CP" className="w-7 h-7 object-contain" />
             </div>
             <div>
               <h2 className="text-xl font-black tracking-tighter leading-none">C-Parrot</h2>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted opacity-40 mt-1">Management</p>
             </div>
          </div>

          <nav className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id as Page)}
                className={navItemClass(item.id as Page)}
              >
                {page === item.id && (
                  <motion.div 
                    layoutId="nav-active" 
                    className="absolute inset-0 bg-primary/10 rounded-[1.25rem] border border-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-0 space-y-4 shrink-0">

          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-bold text-error hover:bg-error/10 transition-all border border-transparent hover:border-error/20"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-[111.11vh] overflow-hidden">
        <header className="h-24 flex items-center justify-between px-8 lg:px-12 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-3 bg-white/5 rounded-2xl">
               <Menu className="w-6 h-6" />
             </button>
             {history.length > 0 && (
               <button 
                 onClick={() => handleNav(history[history.length - 1], false)}
                 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5"
               >
                 <ArrowLeft className="w-3.5 h-3.5" /> Back
               </button>
             )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-4 bg-white/5 hover:bg-primary/10 rounded-2xl relative transition-all border border-white/5 hover:border-primary/20 shadow-premium"
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                ) : (
                  <Sun className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                )}
              </button>
            </div>

            <div className="relative group">
              <button 
                onClick={() => setPage('notifications')}
                className="p-4 bg-white/5 hover:bg-primary/10 rounded-2xl relative transition-all border border-white/5 hover:border-primary/20 shadow-premium"
              >
                <Bell className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 w-4 h-4 bg-primary border-2 border-background rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>


            <div className="flex items-center gap-4 pl-6 border-l border-white/5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black tracking-tight">{me?.first_name?.toUpperCase() || 'AGENT'}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-0.5">{me?.role || 'Clearance'}</p>
              </div>
              <button onClick={() => setPage('profile')} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] p-[1px] shadow-glow hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[15px] bg-background flex items-center justify-center font-black text-sm">
                  {me?.first_name?.[0] || me?.email?.[0]?.toUpperCase() || '?'}
                </div>
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden pb-6">
          <div className="h-full w-full custom-scrollbar overflow-y-auto px-8 lg:px-12">
            <div className="max-w-[1600px] mx-auto py-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={
                    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted opacity-40">Synchronizing Agency Data...</p>
                    </div>
                  }>
                    {page === 'overview' && (isTeamHead ? <TeamHeadDashboard me={me} /> : (me?.role === 'specialist' ? <SpecialistDashboard me={me} /> : <OverviewPage onNavigate={(p: string) => handleNav(p as Page)} me={me} />))}
                    {page === 'projects' && <ProjectsPage me={me} onNavigate={(p: string) => handleNav(p as Page)} />}
                    {page === 'tasks' && <TasksPage me={me} />}
                    {page === 'cycles' && <CyclesPage me={me} />}
                    {page === 'modules' && <ModulesPage me={me} />}
                    {page === 'workflow' && <WorkflowPage me={me} />}
                    {page === 'backups' && <BackupsPage me={me} />}
                    {page === 'kanban' && <KanbanPage me={me} />}
                    {page === 'team' && <TeamPage me={me} />}
                    {page === 'timesheets' && <TimesheetsPage me={me} />}
                    {page === 'my_tasks' && <MyTasksPage me={me} />}
                    {page === 'notifications' && <NotificationsPage me={me} onNavigate={(p: string) => handleNav(p as Page)} />}
                    {page === 'profile' && <ProfilePage me={me} onUpdateMe={(updated: User) => setMe(updated)} />}
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
          </div>
        </section>
      </main>

      <div 
        className="fixed bottom-6 right-6 md:top-24 md:bottom-auto md:right-8 z-[200] flex flex-col gap-3 w-[calc(100%-3rem)] md:w-80 pointer-events-none"
        onMouseEnter={() => setIsNotifyPaused(true)}
        onMouseLeave={() => setIsNotifyPaused(false)}
      >
        <AnimatePresence>
          {notifications.filter((n: any) => !n.read && !dismissedIds.includes(n.id)).map((n: any) => (
            <motion.div 
              key={n.id} 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass p-4 rounded-[1.5rem] border border-white/10 shadow-glow pointer-events-auto cursor-pointer"
              onClick={() => {
                if (n.link) {
                  if (n.link === '/dashboard') return handleNav('overview');
                  if (n.link.startsWith('/task/')) return handleNav('my_tasks');
                  if (n.link === '/admin/backups' || n.link === '/backups') return handleNav('backups');
                  if (n.link === '/team') return handleNav('team');
                  if (n.link === '/projects') return handleNav('projects');
                  if (n.link === '/profile') return handleNav('profile');
                }
                handleNav('notifications');
              }}
            >
               <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                     <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white">{n.title}</h4>
                    <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{n.body}</p>
                  </div>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
