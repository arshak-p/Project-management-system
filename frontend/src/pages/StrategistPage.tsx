import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import type { Project, TaskState, WorkModule, User, Task } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Target, Zap, Plus,
  LayoutGrid, ShieldCheck,
  ChevronRight, Trash2, Download, Rocket
} from 'lucide-react';

/* ─── Row shape ─── */
interface StrategyRow {
  _id: string;               // local key
  _isNew: boolean;           // draft vs persisted
  _dirty: boolean;           // needs save
  taskId?: number;           // existing task id
  posting_date: string;
  module: string;            // module id as string
  title: string;
  reference_link: string;
  content_writer: string;    // user id as string
  state: string;             // state id as string
  priority: string;
  assignee: string;          // user id as string
  scheduled_date: string;
  due_date: string;
  deadline: string;
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDayName(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return DAY_NAMES[d.getDay()];
}

function getDayAbbr(dateStr: string): string {
  const full = getDayName(dateStr);
  if (full === '—') return '—';
  return full.slice(0, 3);
}

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

let _uid = 0;
function uid() { return `draft_${++_uid}_${Date.now()}`; }

function blankRow(): StrategyRow {
  return {
    _id: uid(),
    _isNew: true,
    _dirty: false,
    posting_date: '',
    module: '',
    title: '',
    reference_link: '',
    content_writer: '',
    state: '',
    priority: 'medium',
    assignee: '',
    scheduled_date: '',
    due_date: '',
    deadline: '',
  };
}

function taskToRow(t: Task): StrategyRow {
  return {
    _id: `task_${t.id}`,
    _isNew: false,
    _dirty: false,
    taskId: t.id,
    posting_date: t.posting_date || '',
    module: t.module?.toString() || '',
    title: t.title || '',
    reference_link: t.reference_link || '',
    content_writer: t.content_writer?.id?.toString() || '',
    state: t.state?.toString() || '',
    priority: t.priority || 'medium',
    assignee: t.assignee?.id?.toString() || '',
    scheduled_date: t.scheduled_date || '',
    due_date: t.due_date || '',
    deadline: t.deadline || '',
  };
}

/* ─── Component ─── */
export default function StrategistPage({ me }: { me: User | null }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rows, setRows] = useState<StrategyRow[]>([]);

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState('');

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ─── Permissions ─── */
  const role = me?.role || '';
  const isPMOrAdmin = ['admin', 'project_manager', 'agency_manager'].includes(role);
  const isStrategist = role === 'sales_manager';
  const isTeamHead = role === 'team_head';
  const isSpecialist = role === 'specialist';
  const isContentWriterTeamHead = isTeamHead && !!me?.title?.toLowerCase().includes('content writer');

  const canEdit = (col: string, row?: StrategyRow): boolean => {
    if (isPMOrAdmin) return true;
    if (isStrategist) return ['posting_date', 'module', 'title'].includes(col);
    if (col === 'content_writer') return isContentWriterTeamHead;
    if (col === 'reference_link') {
      if (isSpecialist) {
        if (!row) return true;
        return row.content_writer === me?.id?.toString();
      }
    }
    return false;
  };

  /* ─── Data loading ─── */
  const loadMasterData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, mRes, sRes, uRes] = await Promise.all([
        api.getProjects(),
        api.getModules(),
        api.getStates(),
        api.getUsers(),
      ]);
      setProjects(pRes.data);
      setModules(mRes.data);
      setStates(sRes.data);
      setUsers(uRes.data);
      if (pRes.data.length > 0 && !selectedProject) {
        setSelectedProject(pRes.data[0].id.toString());
      }
    } catch (e) {
      console.error('Load master data failed', e);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadMasterData(); }, [loadMasterData]);

  const loadTasks = useCallback(async () => {
    if (!selectedProject) return;
    const { start, end } = monthRange(selectedMonth);
    try {
      const res = await api.getTasks({
        project: selectedProject,
        posting_date_after: start,
        posting_date_before: end,
      });
      const existingRows = (res.data as Task[]).map(taskToRow);
      setRows(prev => {
        const drafts = prev.filter(r => r._isNew);
        return [...existingRows, ...drafts];
      });
    } catch (e) {
      console.error('Load tasks failed', e);
    }
  }, [selectedProject, selectedMonth]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  /* ─── Row mutations ─── */
  const addRow = () => {
    setRows(prev => [...prev, blankRow()]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const updateCell = (id: string, field: keyof StrategyRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      return { ...r, [field]: value, _dirty: true };
    }));

    // Auto-save for existing rows
    const row = rows.find(r => r._id === id);
    if (row && !row._isNew && row.taskId) {
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        autoSave(id);
      }, 1000);
    }
  };

  const autoSave = async (id: string) => {
    const row = rows.find(r => r._id === id);
    if (!row || row._isNew || !row.taskId) return;
    try {
      await api.updateTask(row.taskId, {
        title: row.title,
        posting_date: row.posting_date || null,
        module: row.module ? Number(row.module) : undefined,
        reference_link: row.reference_link,
        content_writer_id: row.content_writer ? Number(row.content_writer) : null,
        state: row.state ? Number(row.state) : undefined,
        priority: row.priority,
        assignee_id: row.assignee ? Number(row.assignee) : null,
        scheduled_date: row.scheduled_date || null,
        due_date: row.due_date || null,
        deadline: row.deadline || null,
      });
      setRows(prev => prev.map(r => r._id === id ? { ...r, _dirty: false } : r));
    } catch (e) {
      console.error('Auto-save failed', e);
    }
  };

  /* ─── Deploy all drafts ─── */
  const deployAll = async () => {
    const drafts = rows.filter(r => r._isNew && r.title.trim());
    if (drafts.length === 0) return;
    setIsDeploying(true);
    setDeployMsg('Deploying strategy...');
    try {
      const items = drafts.map(d => ({
        title: d.title,
        project: Number(selectedProject),
        posting_date: d.posting_date || null,
        module: d.module ? Number(d.module) : (modules[0]?.id || 1),
        reference_link: d.reference_link,
        content_writer_id: d.content_writer ? Number(d.content_writer) : null,
        state: d.state ? Number(d.state) : (states[0]?.id || 1),
        priority: d.priority,
        assignee_id: d.assignee ? Number(d.assignee) : null,
        scheduled_date: d.scheduled_date || null,
        due_date: d.due_date || null,
        deadline: d.deadline || null,
        description: '',
      }));
      await api.bulkCreateTasks(items);
      setDeployMsg(`Deployed ${drafts.length} tasks successfully!`);
      await loadTasks();
      setTimeout(() => setDeployMsg(''), 3000);
    } catch (e) {
      console.error('Deploy failed', e);
      setDeployMsg('Deployment failed. Check console.');
      setTimeout(() => setDeployMsg(''), 4000);
    } finally {
      setIsDeploying(false);
    }
  };

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = [
      'Post Date', 'Day', 'Module/Scope', 'Content Type', 'Content Link',
      'Content Writer', 'Workflow State', 'Priority', 'Assign Specialist',
      'Task Start Date', 'Due Date', 'Deadline'
    ];
    const csvRows = rows.map(r => [
      r.posting_date,
      getDayAbbr(r.posting_date),
      modules.find(m => m.id.toString() === r.module)?.name || '',
      r.title,
      r.reference_link,
      (() => { const u = users.find(u => u.id.toString() === r.content_writer); return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : ''; })(),
      states.find(s => s.id.toString() === r.state)?.name || '',
      r.priority,
      (() => { const u = users.find(u => u.id.toString() === r.assignee); return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : ''; })(),
      r.scheduled_date,
      r.due_date,
      r.deadline,
    ]);
    const csv = [headers, ...csvRows].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Strategy_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ─── Column Definitions ─── */
  const columns: { key: string; label: string; width: string }[] = [
    { key: 'posting_date', label: 'POST DATE', width: 'w-[140px]' },
    { key: 'day', label: 'DAY', width: 'w-[80px]' },
    { key: 'module', label: 'MODULE / SCOPE', width: 'w-[160px]' },
    { key: 'title', label: 'CONTENT TYPE', width: 'w-[220px]' },
    { key: 'reference_link', label: 'CONTENT LINK', width: 'w-[180px]' },
    { key: 'content_writer', label: 'CONTENT WRITER', width: 'w-[160px]' },
    { key: 'state', label: 'WORKFLOW STATE', width: 'w-[150px]' },
    { key: 'priority', label: 'PRIORITY', width: 'w-[120px]' },
    { key: 'assignee', label: 'ASSIGN SPECIALIST', width: 'w-[160px]' },
    { key: 'scheduled_date', label: 'TASK START DATE', width: 'w-[140px]' },
    { key: 'due_date', label: 'DUE DATE', width: 'w-[140px]' },
    { key: 'deadline', label: 'DEADLINE', width: 'w-[140px]' },
  ];

  const draftCount = rows.filter(r => r._isNew).length;
  const existingCount = rows.filter(r => !r._isNew).length;

  /* ─── Render helpers ─── */
  const cellBaseClass = 'px-3 py-2.5 border-b border-white/5 shrink-0 flex items-center';

  const inputClass = (disabled: boolean) =>
    `w-full bg-transparent border-none outline-none text-xs font-semibold text-white placeholder:text-white/20 ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`;

  const selectClass = (disabled: boolean) =>
    `w-full bg-transparent border-none outline-none text-xs font-semibold text-white appearance-none cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`;

  /* ─── Loading state ─── */
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20 font-inter">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-6"
      >
        <div className="relative">
          <div className="absolute -left-10 top-0 w-24 h-24 bg-primary/20 blur-[60px] rounded-full"></div>
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-4 relative z-10 text-white">
            Strategy Planner <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
          </h1>
          <p className="text-text-muted mt-3 font-bold tracking-[0.4em] uppercase text-[10px] opacity-50 italic">
            Excel-Style Bulk Planning // {selectedMonth}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Project selector */}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-6 py-3.5 glass border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all text-white"
          >
            <option value="" className="bg-background text-white">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-background text-white">{p.name}</option>
            ))}
          </select>

          {/* Month picker */}
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-6 py-3.5 glass border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all text-white"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </motion.div>

      {/* ─── Action Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-6 py-3.5 glass hover:bg-white/5 border border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white"
          >
            <Plus className="w-4 h-4 text-primary" /> Add Row
          </button>
          <button
            onClick={deployAll}
            disabled={draftCount === 0 || isDeploying}
            className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-primary to-[#d946ef] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-premium hover:opacity-90 disabled:opacity-40 transition-all overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <Rocket className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{isDeploying ? 'Deploying...' : 'Deploy All'}</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-6 py-3.5 glass hover:bg-white/5 border border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white disabled:opacity-30"
          >
            <Download className="w-4 h-4 text-primary" /> Export CSV
          </button>
        </div>

        <div className="flex items-center gap-6">
          {deployMsg && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> {deployMsg}
            </motion.span>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40 flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              {existingCount} saved · {draftCount} drafts
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── Grid Table ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bento-card p-0 overflow-hidden border-primary/20"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1800px]">
            {/* Header row */}
            <div className="flex items-center bg-surface/40 border-b border-white/10 sticky top-0 z-10">
              {columns.map(col => (
                <div
                  key={col.key}
                  className={`${col.width} shrink-0 px-3 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted opacity-60`}
                >
                  {col.label}
                </div>
              ))}
              <div className="w-[56px] shrink-0" />
            </div>

            {/* Rows */}
            <AnimatePresence>
              {rows.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-24 text-center"
                >
                  <Target className="w-12 h-12 mx-auto text-text-muted/20 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">
                    No rows yet. Click "Add Row" to begin planning.
                  </p>
                </motion.div>
              ) : (
                rows.map((row, idx) => {
                  const isNewRow = row._isNew;
                  return (
                    <motion.div
                      key={row._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25, delay: idx * 0.02 }}
                      className={`flex items-center hover:bg-white/[0.03] group relative transition-colors ${isNewRow ? 'bg-primary/[0.02]' : ''} ${row._dirty ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      {/* Indicator stripe */}
                      {isNewRow && (
                        <div className="absolute left-0 top-0 w-[3px] h-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      )}
                      {row._dirty && !isNewRow && (
                        <div className="absolute left-0 top-0 w-[3px] h-full bg-amber-500/40" />
                      )}

                      {/* POST DATE */}
                      <div className={`${columns[0].width} ${cellBaseClass} sticky left-0 z-[5] bg-background/80 backdrop-blur-sm`}>
                        <input
                          type="date"
                          value={row.posting_date}
                          onChange={e => updateCell(row._id, 'posting_date', e.target.value)}
                          disabled={!canEdit('posting_date')}
                          className={inputClass(!canEdit('posting_date'))}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>

                      {/* DAY (computed) */}
                      <div className={`${columns[1].width} ${cellBaseClass}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                          {getDayAbbr(row.posting_date)}
                        </span>
                      </div>

                      {/* MODULE / SCOPE */}
                      <div className={`${columns[2].width} ${cellBaseClass}`}>
                        <select
                          value={row.module}
                          onChange={e => updateCell(row._id, 'module', e.target.value)}
                          disabled={!canEdit('module')}
                          className={selectClass(!canEdit('module'))}
                        >
                          <option value="" className="bg-background">—</option>
                          {modules.map(m => (
                            <option key={m.id} value={m.id} className="bg-background">{m.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* CONTENT TYPE (title) */}
                      <div className={`${columns[3].width} ${cellBaseClass}`}>
                        <input
                          type="text"
                          value={row.title}
                          onChange={e => updateCell(row._id, 'title', e.target.value)}
                          disabled={!canEdit('title')}
                          placeholder="Content type..."
                          className={inputClass(!canEdit('title'))}
                        />
                      </div>

                      {/* CONTENT LINK */}
                      <div className={`${columns[4].width} ${cellBaseClass}`}>
                        <input
                          type="text"
                          value={row.reference_link}
                          onChange={e => updateCell(row._id, 'reference_link', e.target.value)}
                          disabled={!canEdit('reference_link', row)}
                          placeholder="https://..."
                          className={inputClass(!canEdit('reference_link', row))}
                        />
                      </div>

                      {/* CONTENT WRITER */}
                      <div className={`${columns[5].width} ${cellBaseClass}`}>
                        <select
                          value={row.content_writer}
                          onChange={e => updateCell(row._id, 'content_writer', e.target.value)}
                          disabled={!canEdit('content_writer')}
                          className={selectClass(!canEdit('content_writer'))}
                        >
                          <option value="" className="bg-background">—</option>
                          {users
                            .filter(u => u.title?.toLowerCase().includes('content writer'))
                            .map(u => (
                              <option key={u.id} value={u.id} className="bg-background">
                                {u.first_name || u.email}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* WORKFLOW STATE */}
                      <div className={`${columns[6].width} ${cellBaseClass}`}>
                        <select
                          value={row.state}
                          onChange={e => updateCell(row._id, 'state', e.target.value)}
                          disabled={!canEdit('state')}
                          className={selectClass(!canEdit('state'))}
                        >
                          <option value="" className="bg-background">—</option>
                          {states.map(s => (
                            <option key={s.id} value={s.id} className="bg-background">{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* PRIORITY */}
                      <div className={`${columns[7].width} ${cellBaseClass}`}>
                        <select
                          value={row.priority}
                          onChange={e => updateCell(row._id, 'priority', e.target.value)}
                          disabled={!canEdit('priority')}
                          className={selectClass(!canEdit('priority'))}
                        >
                          {PRIORITIES.map(p => (
                            <option key={p} value={p} className="bg-background">{p.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* ASSIGN SPECIALIST */}
                      <div className={`${columns[8].width} ${cellBaseClass}`}>
                        <select
                          value={row.assignee}
                          onChange={e => updateCell(row._id, 'assignee', e.target.value)}
                          disabled={!canEdit('assignee')}
                          className={selectClass(!canEdit('assignee'))}
                        >
                          <option value="" className="bg-background">—</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id} className="bg-background">
                              {u.first_name || u.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* TASK START DATE */}
                      <div className={`${columns[9].width} ${cellBaseClass}`}>
                        <input
                          type="date"
                          value={row.scheduled_date}
                          onChange={e => updateCell(row._id, 'scheduled_date', e.target.value)}
                          disabled={!canEdit('scheduled_date')}
                          className={inputClass(!canEdit('scheduled_date'))}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>

                      {/* DUE DATE */}
                      <div className={`${columns[10].width} ${cellBaseClass}`}>
                        <input
                          type="date"
                          value={row.due_date}
                          onChange={e => updateCell(row._id, 'due_date', e.target.value)}
                          disabled={!canEdit('due_date')}
                          className={inputClass(!canEdit('due_date'))}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>

                      {/* DEADLINE */}
                      <div className={`${columns[11].width} ${cellBaseClass}`}>
                        <input
                          type="date"
                          value={row.deadline}
                          onChange={e => updateCell(row._id, 'deadline', e.target.value)}
                          disabled={!canEdit('deadline')}
                          className={inputClass(!canEdit('deadline'))}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>

                      {/* DELETE */}
                      <div className="w-[56px] shrink-0 flex items-center justify-center border-b border-white/5">
                        {isNewRow && (
                          <button
                            onClick={() => removeRow(row._id)}
                            className="p-2 text-error/30 hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-4 bg-surface/20 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-text-muted opacity-40">
            <span className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3" /> {rows.length} total rows
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" /> Auto-save enabled for existing tasks
            </span>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-text-muted opacity-40">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary/50" /> Draft
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500/50" /> Unsaved
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick Tips Panel ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bento-card p-8 border-dashed bg-gradient-to-br from-primary/5 to-transparent"
      >
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-6 italic flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Quick Guide
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">01</div>
            <p className="text-xs font-bold text-text-muted">Select your project and month, then add rows for each content item.</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">02</div>
            <p className="text-xs font-bold text-text-muted">Fill in post dates, modules, content types, and assign writers & specialists.</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">03</div>
            <p className="text-xs font-bold text-text-muted">Click "Deploy All" to push drafts to the live task grid, or export as CSV.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
