import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { can } from '../api';
import { useAuth } from '../auth';
import TaskModal from '../components/TaskModal';
import { useTaskOptions } from '../hooks';
import { Button, PageHeader, Tabs } from '../ui';
import BoardView from './tasks/BoardView';
import CalendarView from './tasks/CalendarView';
import ListView from './tasks/ListView';

type View = 'list' | 'board' | 'calendar';
const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'list') as View;
  const opts = useTaskOptions();
  const [creating, setCreating] = useState(false);
  const [refresh, setRefresh] = useState(0);

  return (
    <>
      <PageHeader
        title="Tasks"
        action={can.createTask(user?.role) && opts.data && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New task</Button>}
      />
      <div className="mb-4"><Tabs value={view} onChange={(v) => setParams({ view: v })} items={VIEWS} /></div>
      {view === 'list' && <ListView key={refresh} />}
      {view === 'board' && <BoardView key={refresh} />}
      {view === 'calendar' && <CalendarView key={refresh} />}
      {creating && opts.data && (
        <TaskModal task={null} options={opts.data} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setRefresh((n) => n + 1); }} />
      )}
    </>
  );
}
