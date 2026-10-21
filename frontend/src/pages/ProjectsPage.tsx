import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../ui';
import CycleList from './projects/CycleList';
import ModuleList from './projects/ModuleList';
import ProjectList from './projects/ProjectList';

type Tab = 'projects' | 'cycles' | 'types';
const TABS: { id: Tab; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'cycles', label: 'Cycles' },
  { id: 'types', label: 'Content types' },
];

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'projects') as Tab;
  return (
    <>
      <PageHeader title="Projects" subtitle="One project per client" />
      <div className="mb-4"><Tabs value={tab} onChange={(v) => setParams({ tab: v })} items={TABS} /></div>
      {tab === 'projects' && <ProjectList />}
      {tab === 'cycles' && <CycleList />}
      {tab === 'types' && <ModuleList />}
    </>
  );
}
