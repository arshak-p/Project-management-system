import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Download, Plus, Rocket, Trash2 } from 'lucide-react';
import { api, can, errorMessage, fullName, type Strategy, type Task } from '../api';
import { useAuth } from '../auth';
import TaskModal from '../components/TaskModal';
import { useLoad, useTaskOptions } from '../hooks';
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, fmtDate, inputCls } from '../ui';

interface Draft { posting_date: string; module: number | ''; title: string }
const blank = (): Draft => ({ posting_date: '', module: '', title: '' });

/** Content plan: a strategy is a named batch of posts for one project. */
export default function StrategyPage() {
  const { user } = useAuth();
  const planner = can.planStrategy(user?.role);
  const opts = useTaskOptions();
  const strategies = useLoad(() => api.strategies());
  const [projectId, setProjectId] = useState<number | ''>('');
  const [strategyId, setStrategyId] = useState<number | ''>('');
  const [naming, setNaming] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([blank()]);
  const [open, setOpen] = useState<Task | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const projects = useMemo(() => opts.data?.projects ?? [], [opts.data]);
  useEffect(() => { if (projectId === '' && projects.length) setProjectId(projects[0].id); }, [projects, projectId]);

  const plans = useMemo(
    () => (strategies.data ?? []).filter((s) => s.project === projectId),
    [strategies.data, projectId],
  );
  useEffect(() => {
    if (!plans.some((p) => p.id === strategyId)) setStrategyId(plans[0]?.id ?? '');
  }, [plans, strategyId]);
  const plan: Strategy | undefined = plans.find((p) => p.id === strategyId);

  const tasks = useLoad(
    () => (strategyId === '' ? Promise.resolve([] as Task[]) : api.tasks({ strategy: strategyId })),
    [strategyId],
  );

  if (opts.loading || strategies.loading) return <Spinner />;
  const o = opts.data;
  if (!o) return <ErrorBox text={opts.error} />;
  const moduleName = (id: number) => o.modules.find((m) => m.id === id)?.name ?? '—';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const addPosts = (e: FormEvent) => {
    e.preventDefault();
    const rows = drafts.filter((d) => d.title.trim() && d.module !== '');
    if (!plan || rows.length === 0) return setError('Add at least one post with a title and content type.');
    const state = o.states.find((s) => s.slug === 'pending') ?? o.states[0];
    run(async () => {
      const res = await api.bulkCreateTasks(rows.map((d) => ({
        project: plan.project, strategy: plan.id, title: d.title.trim(), module: d.module,
        state: state.id, posting_date: d.posting_date || null, priority: 'medium',
      })));
      if (res.data.total_errors) throw new Error(`${res.data.total_errors} post(s) could not be created.`);
      setDrafts([blank()]);
      tasks.reload();
    });
  };

  const deploy = () => plan && confirm(`Deploy "${plan.name}"? The team will be notified.`) &&
    run(async () => { await api.deployStrategy(plan.id); strategies.reload(); });

  const exportCsv = () => plan && run(async () => {
    const blob = await api.exportStrategy(plan.id);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${plan.name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return (
    <>
      <PageHeader
        title="Content plan"
        subtitle="Plan posts for a project, then deploy the plan to the team"
        action={planner && <Button onClick={() => setNaming(true)} disabled={projectId === ''}><Plus className="h-4 w-4" /> New plan</Button>}
      />
      <ErrorBox text={error || strategies.error || tasks.error} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={inputCls + ' w-auto'} aria-label="Project" value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={inputCls + ' w-auto'} aria-label="Plan" value={strategyId} onChange={(e) => setStrategyId(Number(e.target.value))} disabled={plans.length === 0}>
          {plans.length === 0 && <option value="">No plans yet</option>}
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_deployed ? ' (deployed)' : ''}</option>)}
        </select>
        {plan && (
          <>
            <Button variant="ghost" onClick={exportCsv} busy={busy}><Download className="h-4 w-4" /> Export</Button>
            {planner && !plan.is_deployed && <Button onClick={deploy} busy={busy}><Rocket className="h-4 w-4" /> Deploy</Button>}
            {plan.is_deployed && <Badge tone="green">Deployed</Badge>}
          </>
        )}
      </div>

      {plan ? (
        <>
          <Card className="mb-6 overflow-x-auto">
            {tasks.loading ? <Spinner /> : (tasks.data?.length ?? 0) === 0 ? <Empty text="No posts in this plan yet." /> : (
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Post date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Writer</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.data?.map((t) => (
                    <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(t)}>
                      <td className="px-4 py-3">{fmtDate(t.posting_date)}</td>
                      <td className="px-4 py-3">{moduleName(t.module)}</td>
                      <td className="px-4 py-3 font-medium">{t.title}</td>
                      <td className="px-4 py-3">{t.content_writer ? fullName(t.content_writer) : '—'}</td>
                      <td className="px-4 py-3">{fullName(t.assignee)}</td>
                      <td className="px-4 py-3"><Badge tone="blue">{t.state__name}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {planner && (
            <Card className="p-5">
              <h2 className="mb-3 font-medium">Add posts</h2>
              <form onSubmit={addPosts} className="space-y-2">
                {drafts.map((d, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[10rem_12rem_1fr_auto]">
                    <input className={inputCls} type="date" aria-label="Post date" value={d.posting_date} onChange={(e) => setDrafts(drafts.map((x, j) => j === i ? { ...x, posting_date: e.target.value } : x))} />
                    <select className={inputCls} aria-label="Content type" value={d.module} onChange={(e) => setDrafts(drafts.map((x, j) => j === i ? { ...x, module: e.target.value ? Number(e.target.value) : '' } : x))}>
                      <option value="">Type…</option>
                      {o.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input className={inputCls} placeholder="Title" value={d.title} onChange={(e) => setDrafts(drafts.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                    <button type="button" aria-label="Remove row" className="px-2 text-slate-500" onClick={() => setDrafts(drafts.length > 1 ? drafts.filter((_, j) => j !== i) : [blank()])}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setDrafts([...drafts, blank()])}><Plus className="h-4 w-4" /> Another row</Button>
                  <Button type="submit" busy={busy}>Save posts</Button>
                </div>
              </form>
            </Card>
          )}
        </>
      ) : (
        <Card><Empty text={planner ? 'Create a plan to start adding posts.' : 'No plans for this project yet.'} /></Card>
      )}

      {naming && projectId !== '' && (
        <PlanForm projectId={projectId} onClose={() => setNaming(false)} onSaved={(s) => { setNaming(false); strategies.reload(); setStrategyId(s.id); }} />
      )}
      {open && <TaskModal task={open} options={o} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); tasks.reload(); }} />}
    </>
  );
}

function PlanForm({ projectId, onClose, onSaved }: { projectId: number; onClose: () => void; onSaved: (s: Strategy) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { onSaved(await api.saveStrategy({ project: projectId, name: name.trim() })); } catch (err) { setError(errorMessage(err)); }
  };
  return (
    <Modal title="New plan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <Field label="Plan name"><input className={inputCls} required placeholder="e.g. May 2026 content" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Create</Button></div>
      </form>
    </Modal>
  );
}
