import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api, can, errorMessage, type Project } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { Button, Card, Empty, ErrorBox, Field, Modal, Spinner, fmtMinutes, inputCls } from '../../ui';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ProjectList() {
  const { user } = useAuth();
  const manage = can.manageProjects(user?.role);
  const projects = useLoad(() => api.projects());
  const tasks = useLoad(() => api.tasks());
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);

  if (projects.loading || tasks.loading) return <Spinner />;
  const counts = new Map<number, number>();
  tasks.data?.forEach((t) => counts.set(t.project, (counts.get(t.project) ?? 0) + 1));

  return (
    <>
      {manage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New project</Button>
        </div>
      )}
      <ErrorBox text={projects.error} />
      {projects.data?.length === 0 && <Card><Empty text="No projects yet." /></Card>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.data?.map((p) => (
          <Card key={p.id} className="p-5">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{p.description || 'No description.'}</p>
            <div className="mt-3 flex justify-between text-sm text-slate-600">
              <span>{counts.get(p.id) ?? 0} tasks</span><span>{fmtMinutes(p.total_minutes ?? 0)} logged</span>
            </div>
            {manage && <Button variant="ghost" className="mt-3 w-full" onClick={() => setEditing(p)}>Edit</Button>}
          </Card>
        ))}
      </div>
      {editing !== undefined && (
        <ProjectForm project={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); projects.reload(); }} />
      )}
    </>
  );
}

function ProjectForm({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.saveProject(project ? { name, description } : { name, description, slug: slugify(name) }, project?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!project || !confirm(`Archive ${project.name}? Its tasks will be hidden from most people.`)) return;
    try { await api.deleteProject(project.id); onSaved(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox text={error} />
        <Field label="Name"><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="flex justify-between">
          {project ? <Button type="button" variant="danger" onClick={archive}>Archive</Button> : <span />}
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Save</Button></div>
        </div>
      </form>
    </Modal>
  );
}

