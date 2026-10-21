import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { PageHeader, Tabs } from '../ui';
import BackupList from './settings/BackupList';
import WorkflowList from './settings/WorkflowList';

type Tab = 'workflow' | 'backups';

export default function SettingsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabs: { id: Tab; label: string }[] = [
    { id: 'workflow', label: 'Workflow' },
    ...(user?.role === 'admin' ? [{ id: 'backups' as Tab, label: 'Backups' }] : []),
  ];
  const tab = (tabs.find((t) => t.id === params.get('tab'))?.id ?? 'workflow') as Tab;
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-4"><Tabs value={tab} onChange={(v) => setParams({ tab: v })} items={tabs} /></div>
      {tab === 'workflow' ? <WorkflowList /> : <BackupList />}
    </>
  );
}
