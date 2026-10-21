import { api } from '../api';
import { useLoad } from '../hooks';
import { Card, Empty, ErrorBox, Spinner } from '../ui';

/** Recent changes feed, shown on Home for everyone except team members. */
export default function ActivityFeed() {
  const { data, loading, error } = useLoad(async () => {
    const [activity, users] = await Promise.all([api.activity(), api.users().catch(() => [])]);
    return { activity, users };
  });
  if (loading) return <Spinner />;
  const who = (id: number | null) => {
    const u = data?.users.find((x) => x.id === id);
    return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : 'Someone';
  };

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-medium">Recent activity</h2>
      <ErrorBox text={error} />
      {data?.activity.length === 0 && <Empty text="No activity yet." />}
      <ul className="divide-y divide-slate-100">
        {data?.activity.slice(0, 8).map((a) => (
          <li key={a.id} className="flex justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-medium">{who(a.user)}</span> {a.action} {a.entity_type.replace('_', ' ')}{' '}
              <span className="text-slate-600">{a.payload?.task_code ?? ''} {a.payload?.title ?? a.payload?.name ?? ''}</span>
            </span>
            <time className="shrink-0 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</time>
          </li>
        ))}
      </ul>
    </Card>
  );
}
