import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Notification, User } from '../../api';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import TaskDetailModal from '../../components/TaskDetailModal';

export default function NotificationsPage({ me }: { me: User | null }) {
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
      // Notify other components (like Dashboard) that unread count changed
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
    if (n.link && n.link.startsWith('/task/')) {
      const taskId = parseInt(n.link.replace('/task/', ''));
      if (taskId) setSelectedTaskId(taskId);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
          me={me}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-text-muted mt-1">{unread.length} unread notification{unread.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
            <button 
              onClick={markAllRead}
              className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-sm rounded-xl font-semibold hover:bg-primary/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark all as read
            </button>
          )}
          {unread.length > 0 && (
            <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-sm rounded-full font-semibold">
              {unread.length} New
            </span>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-16 text-center">
          <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">You're all caught up!</h3>
          <p className="text-text-muted text-sm">No notifications yet. We'll let you know when something happens.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unread.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Unread</h3>
              <div className="glass rounded-2xl border border-primary/20 overflow-hidden divide-y divide-border/40">
                {unread.map(n => (
                  <div key={n.id} onClick={() => handleNotifyClick(n)} className="flex items-start gap-4 p-5 hover:bg-surface/30 transition-colors group bg-primary/5 cursor-pointer">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-text">{n.title}</h4>
                      {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                      <span className="flex items-center gap-1 text-xs text-text-muted mt-2">
                        <Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => markRead(n.id)}
                      className="opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-primary hover:text-green-400 transition-all px-3 py-1.5 glass border border-border rounded-lg flex-shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark read
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {read.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mt-4">Earlier</h3>
              <div className="glass rounded-2xl border border-border overflow-hidden divide-y divide-border/40">
                {read.map(n => (
                  <div key={n.id} onClick={() => handleNotifyClick(n)} className="flex items-start gap-4 p-5 hover:bg-surface/40 transition-colors opacity-70 cursor-pointer">
                    <div className="p-2.5 rounded-xl bg-surface text-text-muted flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-text">{n.title}</h4>
                      {n.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{n.body}</p>}
                      <span className="flex items-center gap-1 text-xs text-text-muted mt-2">
                        <Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
