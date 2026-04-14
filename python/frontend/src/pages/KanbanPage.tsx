import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loader2, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KanbanColumn({ state, tasks, onDelete, onClick }: { state: any; tasks: any[]; onDelete: (id: number) => void; onClick: (id: number) => void }) {
  const dotColors = ['bg-slate-400', 'bg-blue-400', 'bg-yellow-400', 'bg-orange-400', 'bg-green-500', 'bg-teal-400'];
  const idx = state.sort_order ?? 0;
  const dot = dotColors[idx % dotColors.length];
  return (
    <div className="glass rounded-2xl border border-border/50 flex flex-col min-w-[260px] max-w-[300px] flex-shrink-0">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`}></span>
          <h3 className="font-bold text-sm">{state.name}</h3>
        </div>
        <span className="text-xs font-bold bg-surface px-2 py-0.5 rounded-full border border-border text-text-muted">{tasks.length}</span>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[60vh]">
        {tasks.length === 0 && <p className="text-center text-text-muted text-xs py-6">No tasks here</p>}
        {tasks.map(task => (
          <div key={task.id} onClick={() => onClick(task.id)} className="bg-surface border border-border/50 rounded-xl p-3 hover:border-primary/30 transition-colors group cursor-pointer shadow-sm">
            <div className="flex justify-between items-start gap-2">
              <code className="text-xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{task.task_code}</code>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} 
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 hover:text-error text-text-muted rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm font-medium text-text mt-2 line-clamp-2">{task.title}</p>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                ${task.priority === 'urgent' ? 'text-red-400 bg-red-400/10' :
                  task.priority === 'high' ? 'text-orange-400 bg-orange-400/10' :
                  task.priority === 'medium' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                {task.priority}
              </span>
              {task.due_date && <span className="text-xs text-text-muted">📅 {task.due_date}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [states, setStates] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [showStateForm, setShowStateForm] = useState(false);
  const [newState, setNewState] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const load = () => {
    Promise.all([api.getTasks(), api.getStates(), api.getProjects()])
      .then(([t, s, p]) => {
        setTasks(t.data);
        setStates(s.data);
        setProjects(p.data);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await api.deleteTask(id);
    load();
  };

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createState({ name: newState, slug: newState.toLowerCase().replace(/\s+/g, '-') });
    setNewState('');
    setShowStateForm(false);
    load();
  };

  const filteredTasks = selectedProject
    ? tasks.filter(t => t.project === Number(selectedProject))
    : tasks;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => { setSelectedTaskId(null); load(); }} 
        />
      )}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-primary" /> Kanban Board
          </h1>
          <p className="text-text-muted mt-1">Visual workflow across all pipeline stages.</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none min-w-[180px]">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowStateForm(!showStateForm)} className="flex items-center gap-2 px-4 py-2.5 glass border border-border hover:border-primary/50 text-sm rounded-xl transition-colors">
            <Plus className="w-4 h-4 text-primary" /> Add Column
          </button>
        </div>
      </div>

      {showStateForm && (
        <form onSubmit={handleAddState} className="flex gap-3 glass border border-primary/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <input value={newState} onChange={e => setNewState(e.target.value)} placeholder="Column/State name (e.g. In Review)" required className="flex-1 px-4 py-2 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
          <button type="submit" className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">Add</button>
          <button type="button" onClick={() => setShowStateForm(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors">Cancel</button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4">
          {states.map(state => (
            <KanbanColumn
              key={state.id}
              state={state}
              tasks={filteredTasks.filter(t => t.state === state.id)}
              onDelete={handleDelete}
              onClick={setSelectedTaskId}
            />
          ))}
          {states.length === 0 && (
            <div className="glass rounded-2xl border border-border p-12 text-center w-full">
              <LayoutGrid className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No workflow states</h3>
              <p className="text-text-muted text-sm mb-4">Add a column to start organizing your tasks on the Kanban board.</p>
              <button onClick={() => setShowStateForm(true)} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">Add First Column</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
