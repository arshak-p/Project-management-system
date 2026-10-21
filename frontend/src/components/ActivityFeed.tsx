import { api, fullName } from '../api';
import { useLoad } from '../hooks';
import { Card, Empty, ErrorBox, Spinner } from '../ui';

/** Most recent changes across everything the signed-in user can see. */
export default function ActivityFeed() {
  const { data, loading, error } = useLoad(() => api.activity());
  if (loading) return <Spinner />;
  return (
    <Card className="p-5 lg:col-span-2">
      <h2 className="mb-1 font-medium">Recent activity</h2>
      <ErrorBox text={error} />
      {data?.length === 0 && <Empty text="No activity yet." />}
      <ul className="divide-y divide-slate-100">
        {data?.slice(0, 8).map((a) => (
          <li key={a.id} className="flex justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-medium">{a.user ? fullName(a.user) : 'System'}</span> {a.action} {a.entity_type.replace('_', ' ')}{' '}
              <span className="text-slate-600">{a.payload?.task_code ?? ''} {a.payload?.title ?? a.payload?.name ?? ''}</span>
            </span>
            <time className="shrink-0 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</time>
          </li>
        ))}
      </ul>
    </Card>
  );
}
