import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Notification, User } from '../../api';
import { Bell, CheckCircle, Clock, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDetailModal from '../../components/TaskDetailModal';

export default function NotificationsPage({ me, onNavigate }: { me: User | null, onNavigate?: (page: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = () => api.getNotifications().then(r => setNotifications(r.data)).finally(() => setIsLoading(false));
  useEffect(() => { load(); }, []);

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  const markRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      load();
      window.dispatchEvent(new Event('notificationRead'));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      load();
      window.dispatchEvent(new Event('notificationRead'));
    } catch (e) { console.error(e); }
  };

  const handleNotifyClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.link) {
      if (n.link.startsWith('/task/')) {
        const taskId = parseInt(n.link.replace('/task/', ''));
        if (taskId) setSelectedTaskId(taskId);
      } else if (onNavigate) {
        if (n.link === '/dashboard') onNavigate('overview');
        else if (n.link === '/admin/backups' || n.link === '/backups') onNavigate('backups');
        else if (n.link === '/team') onNavigate('team');
        else if (n.link === '/projects') onNavigate('projects');
        else if (n.link === '/profile') onNavigate('profile');
      }
    }
  };

  const requestPush = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Native Notifications Enabled!');
    } else {
      alert('Notifications are blocked. Please enable them in your browser settings.');
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, x: 40, scale: 0.96 },
    visible: (i: number) => ({
      opacity: 1, x: 0, scale: 1,
      transition: { delay: i * 0.055, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }),
    exit: { opacity: 0, x: 60, scale: 0.93, transition: { duration: 0.25, ease: 'easeIn' as const } }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full shadow-glow"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 pb-24 font-inter"
    >
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => { setSelectedTaskId(null); load(); }}
          me={me}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
          <h1 className="text-4xl font-black tracking-tighter">Notifications</h1>
          <p className="text-text-muted mt-1 text-[10px] font-bold uppercase tracking-widest opacity-60">
            {unread.length > 0 ? `${unread.length} unread • Action Required` : 'All caught up • Inbox Clear'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="flex items-center gap-3 flex-wrap"
        >
          <AnimatePresence>
            {unread.length > 0 && (
              <motion.button
                key="mark-all"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={markAllRead}
                className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 text-xs rounded-xl font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 hover:scale-105"
              >
                <CheckCircle className="w-4 h-4" /> Mark all read
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {unread.length > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-xs rounded-full font-black animate-pulse-glow"
              >
                {unread.length} New
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={requestPush}
            className="px-4 py-2.5 bg-surface text-text border border-border text-xs rounded-xl font-black uppercase tracking-widest hover:border-primary/50 transition-all flex items-center gap-2 hover:scale-105"
          >
            <Bell className="w-4 h-4" /> Enable Desktop Alerts
          </button>
        </motion.div>
      </div>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-[2rem] border border-border p-20 text-center"
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            <BellOff className="w-14 h-14 text-text-muted/20 mx-auto mb-6" />
          </motion.div>
          <h3 className="text-2xl font-black mb-2">You're all caught up!</h3>
          <p className="text-text-muted text-sm font-medium">No notifications yet. We'll let you know when something happens.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">

          {/* Unread */}
          <AnimatePresence>
            {unread.length > 0 && (
              <motion.div
                key="unread-section"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                  Unread — {unread.length} pending
                </p>
                <div className="glass rounded-[2rem] border border-primary/20 overflow-hidden">
                  <AnimatePresence>
                    {unread.map((n, i) => (
                      <motion.div
                        key={n.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        onClick={() => handleNotifyClick(n)}
                        className="notif-row flex items-start gap-4 p-5 hover:bg-primary/5 transition-colors group bg-primary/[0.03] cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 8 }}
                          className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0 mt-0.5 shadow-glow"
                        >
                          <Bell className="w-4 h-4" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-text group-hover:text-primary transition-colors">{n.title}</h4>
                          {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>}
                          <span className="flex items-center gap-1.5 text-[10px] text-text-muted/60 mt-2 font-bold uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={e => { e.stopPropagation(); markRead(n.id); }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] text-primary font-black uppercase tracking-widest hover:text-emerald-400 transition-all px-3 py-1.5 glass border border-primary/20 rounded-xl flex-shrink-0"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark read
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Read */}
          {read.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: unread.length * 0.04 + 0.1 }}
            >
              <p className="text-[10px] font-black text-text-muted/50 uppercase tracking-[0.25em] mb-3">Earlier</p>
              <div className="glass rounded-[2rem] border border-border overflow-hidden">
                {read.map((n, i) => (
                  <motion.div
                    key={n.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleNotifyClick(n)}
                    className="notif-row flex items-start gap-4 p-5 hover:bg-surface/40 transition-colors opacity-60 hover:opacity-100 cursor-pointer border-b border-white/5 last:border-0 group"
                  >
                    <div className="p-2.5 rounded-xl bg-surface text-text-muted flex-shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-text">{n.title}</h4>
                      {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-1 leading-relaxed">{n.body}</p>}
                      <span className="flex items-center gap-1.5 text-[10px] text-text-muted/60 mt-2 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
