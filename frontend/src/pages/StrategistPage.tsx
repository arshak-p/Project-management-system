import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Project, TaskState, WorkModule, User } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Zap, Plus, 
  LayoutGrid, 
  ShieldCheck, 
  ChevronRight, BrainCircuit,
  Trash2
} from 'lucide-react';

interface DraftTask {
  title: string;
  project_id: string;
  due_date: string;
  deadline: string;
  priority: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StrategistPage({ me: _me }: { me: User | null }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [modules, setModules] = useState<WorkModule[]>([]);
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const [filterModule, setFilterModule] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      api.getProjects(),
      api.getStates(),
      api.getModules()
    ])
      .then(([p, s, m]) => {
        setProjects(p.data);
        setStates(s.data);
        setModules(m.data);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const addDraft = () => {
    setDrafts([...drafts, { 
      title: '', 
      project_id: projects[0]?.id.toString() || '', 
      due_date: new Date().toISOString().split('T')[0], 
      deadline: new Date().toISOString().split('T')[0],
      priority: 'medium' 
    }]);
  };

  const updateDraft = (index: number, field: keyof DraftTask, value: string) => {
    const newDrafts = [...drafts];
    newDrafts[index][field] = value;
    setDrafts(newDrafts);
  };

  const removeDraft = (index: number) => {
    setDrafts(drafts.filter((_, i) => i !== index));
  };

  const deployStrategy = async () => {
    if (drafts.length === 0) return;
    setIsDeploying(true);
    setDeploymentLog(['Initializing deployment sequence...', 'Validating tactical data...']);

    try {
      const defaultState = states[0]?.id || 1;
      const targetModule = filterModule ? Number(filterModule) : (modules[0]?.id || 1);

      for (const draft of drafts) {
        if (!draft.title) continue;
        setDeploymentLog(prev => [...prev, `Deploying unit: ${draft.title}...`]);
        await api.createTask({
          title: draft.title,
          project: Number(draft.project_id),
          state: defaultState,
          module: targetModule,
          priority: draft.priority,
          due_date: draft.due_date,
          deadline: draft.deadline,
          description: 'Strategically generated via Mission Control.'
        });
      }

      setDeploymentLog(prev => [...prev, 'Deployment successful. All units active.']);
      setTimeout(() => {
        setDrafts([]);
        setIsDeploying(false);
        setDeploymentLog([]);
      }, 2000);
    } catch (err) {
      console.error(err);
      setDeploymentLog(prev => [...prev, 'CRITICAL ERROR: Deployment failed.']);
      setIsDeploying(false);
    }
  };

  const exportToCSV = () => {
    if (drafts.length === 0) return;
    const headers = ['Operation Title', 'Project', 'Department Target', 'Due Date', 'Deadline', 'Priority'];
    const rows = drafts.map(d => [
      d.title || 'Untitled',
      projects.find(p => p.id.toString() === d.project_id)?.name || 'N/A',
      modules.find(m => m.id.toString() === filterModule)?.name || 'Global',
      d.due_date,
      d.deadline,
      d.priority.toUpperCase()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Tactical_Strategy_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
       <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20 font-inter max-w-5xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="relative">
          <div className="absolute -left-10 top-0 w-24 h-24 bg-primary/20 blur-[60px] rounded-full"></div>
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-4 relative z-10 text-white">
            Strategist <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
          </h1>
          <p className="text-text-muted mt-3 font-bold tracking-[0.4em] uppercase text-[10px] opacity-50 italic">Centralized Mission Planning // Tactical Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select 
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-6 py-3.5 glass border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all text-white"
          >
            <option value="">Strategy Target: Global</option>
            {modules.map(m => <option key={m.id} value={m.id} className="bg-background text-white">{m.name}</option>)}
          </select>
          <button 
            onClick={exportToCSV}
            disabled={drafts.length === 0}
            className="flex items-center gap-2 px-6 py-3.5 glass hover:bg-white/5 border border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white disabled:opacity-30"
          >
            Download CSV
          </button>
          <button 
            onClick={addDraft}
            className="flex items-center gap-2 px-6 py-3.5 glass hover:bg-white/5 border border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white"
          >
            <Plus className="w-4 h-4 text-primary" /> Add Draft
          </button>
          <button 
            onClick={deployStrategy}
            disabled={drafts.length === 0 || isDeploying}
            className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-primary to-[#d946ef] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-premium hover:opacity-90 disabled:opacity-40 transition-all overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <Zap className="w-4 h-4 relative z-10" /> 
            <span className="relative z-10">{isDeploying ? 'Deploying...' : 'Deploy Strategy'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bento-card p-0 overflow-hidden border-primary/20">
            <div className="p-8 bg-surface/30 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-primary" /> Draft Planning Quadrant
              </h3>
              <span className="text-[10px] font-black opacity-40 italic">{drafts.length} Units Ready</span>
            </div>

            <div className="p-8 space-y-4">
              {drafts.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-40">
                  <Target className="w-12 h-12 mx-auto text-text-muted/40" />
                  <p className="text-sm font-bold uppercase tracking-widest">No strategic drafts initiated.<br/>Click "Add Draft" to begin planning.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {drafts.map((draft, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass p-5 rounded-[2rem] border border-white/5 flex flex-col md:flex-row gap-6 items-center group relative overflow-hidden"
                    >
                      <div className="flex-1 w-full space-y-2">
                         <input 
                           value={draft.title} 
                           onChange={(e) => updateDraft(idx, 'title', e.target.value)}
                           placeholder="Operation Title..."
                           className="w-full bg-transparent border-none outline-none font-black text-xl placeholder:opacity-20"
                         />
                         <div className="flex items-center gap-4 flex-wrap">
                            <select 
                              value={draft.project_id} 
                              onChange={(e) => updateDraft(idx, 'project_id', e.target.value)}
                              className="bg-transparent border-none outline-none text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer"
                            >
                              {projects.map(p => <option key={p.id} value={p.id} className="bg-background">{p.name}</option>)}
                            </select>
                            <span className="text-text-muted/20 text-xs">|</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest">DUE</span>
                               <input 
                                 type="date" 
                                 title="Due Date"
                                 value={draft.due_date}
                                 onChange={(e) => updateDraft(idx, 'due_date', e.target.value)}
                                 className="bg-transparent border-none outline-none text-[10px] font-black text-amber-500 uppercase tracking-widest cursor-pointer"
                                 style={{ colorScheme: 'dark' }}
                               />
                            </div>
                            <span className="text-text-muted/20 text-xs">|</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest text-red-500">DEADLINE</span>
                               <input 
                                 type="date" 
                                 title="Final Deadline"
                                 value={draft.deadline}
                                 onChange={(e) => updateDraft(idx, 'deadline', e.target.value)}
                                 className="bg-transparent border-none outline-none text-[10px] font-black text-red-500 uppercase tracking-widest cursor-pointer"
                                 style={{ colorScheme: 'dark' }}
                               />
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <select 
                          value={draft.priority}
                          onChange={(e) => updateDraft(idx, 'priority', e.target.value)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest appearance-none cursor-pointer border ${
                            draft.priority === 'urgent' ? 'text-error border-error/20 bg-error/10' : 'text-primary border-primary/20 bg-primary/10'
                          }`}
                        >
                          <option value="urgent" className="bg-background">URGENT</option>
                          <option value="high" className="bg-background">HIGH</option>
                          <option value="medium" className="bg-background">MEDIUM</option>
                          <option value="low" className="bg-background">LOW</option>
                        </select>
                        <button 
                          onClick={() => removeDraft(idx)}
                          className="p-3 text-error/40 hover:text-error hover:bg-error/10 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bento-card p-10 bg-gradient-to-br from-primary/10 to-transparent">
             <div className="flex items-center gap-4 mb-8">
                <ShieldCheck className="w-8 h-8 text-primary shadow-glow" />
                <div>
                   <h4 className="font-black text-sm tracking-tight">Mission Control</h4>
                   <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-60">Status: Standby</p>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 opacity-40 italic">Deployment Logs</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px]">
                     {deploymentLog.length === 0 ? (
                       <p className="text-text-muted/20">Waiting for tactical command...</p>
                     ) : (
                       deploymentLog.map((log, i) => (
                         <p key={i} className="text-primary flex items-center gap-2">
                           <ChevronRight className="w-3 h-3" /> {log}
                         </p>
                       ))
                     )}
                  </div>
                </div>

                <div className="p-5 glass rounded-3xl border border-white/5">
                   <p className="text-xs font-bold leading-relaxed opacity-60 italic">"Strategy is not a long-term plan accurately mapped out; it is the evolution of a central idea through continually changing circumstances."</p>
                </div>
             </div>
          </div>

          <div className="bento-card p-8 border-dashed">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-6 italic">Strategy Guide</h4>
             <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">01</div>
                   <p className="text-xs font-bold text-text-muted">Draft all tasks for the upcoming operational cycle.</p>
                </div>
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">02</div>
                   <p className="text-xs font-bold text-text-muted">Assign deadlines and prioritize mission-critical units.</p>
                </div>
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">03</div>
                   <p className="text-xs font-bold text-text-muted">Execute deployment to push strategy to the live grid.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
