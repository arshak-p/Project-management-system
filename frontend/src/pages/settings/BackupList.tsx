import { useState } from 'react';
import { Download } from 'lucide-react';
import { api, errorMessage, type Backup } from '../../api';
import { useLoad } from '../../hooks';
import { Badge, Button, Card, Empty, ErrorBox, Spinner, fmtDate } from '../../ui';

/** Monthly backups. A backup is approved the first time an admin downloads it. */
export default function BackupList() {
  const data = useLoad(() => api.backups());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (data.loading) return <Spinner />;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await fn(); data.reload(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const download = (b: Backup) => run(async () => {
    const blob = await api.downloadBackup(b);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${b.month}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">A backup is created automatically on the 1st of each month.</p>
        <Button variant="ghost" busy={busy} onClick={() => confirm('Create a backup now? This can take a minute.') && run(() => api.runBackup())}>Create backup now</Button>
      </div>
      <ErrorBox text={error || data.error} />
      <Card>
        {data.data?.length === 0 ? <Empty text="No backups yet." /> : (
          <ul className="divide-y divide-slate-100">
            {data.data?.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <div className="font-medium">{b.month}</div>
                  <div className="text-slate-500">Created {fmtDate(b.created_at)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={b.is_approved ? 'green' : 'slate'}>{b.is_approved ? 'Approved' : 'Waiting for approval'}</Badge>
                  <Button variant="ghost" busy={busy} onClick={() => download(b)}><Download className="h-4 w-4" /> {b.is_approved ? 'Download' : 'Approve & download'}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
