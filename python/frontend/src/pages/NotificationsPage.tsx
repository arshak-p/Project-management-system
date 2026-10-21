import { api } from '../api';
import { useLoad } from '../hooks';
import { Button, Card, Empty, ErrorBox, PageHeader, Spinner, cx } from '../ui';

export default function NotificationsPage() {
  const { data, loading, error, reload } = useLoad(() => api.notifications());
  if (loading) return <Spinner />;
  const unread = data?.filter((n) => !n.read) ?? [];

  const markAll = async () => {
    await Promise.all(unread.map((n) => api.markRead(n.id).catch(() => undefined)));
    reload();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unread.length} unread`}
        action={unread.length > 0 && <Button variant="ghost" onClick={markAll}>Mark all read</Button>}
      />
      <ErrorBox text={error} />
      <Card>
        {data?.length === 0 ? <Empty text="You're all caught up." /> : (
          <ul className="divide-y divide-slate-100">
            {data?.slice(0, 100).map((n) => (
              <li key={n.id} className={cx('flex items-start justify-between gap-3 px-4 py-3 text-sm', !n.read && 'bg-brand-soft')}>
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-slate-600">{n.body}</div>}
                  <time className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</time>
                </div>
                {!n.read && <Button variant="ghost" onClick={() => api.markRead(n.id).then(reload)}>Mark read</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
