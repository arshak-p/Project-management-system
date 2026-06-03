import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Task, TaskComment, TimeLog, WorkItemAttachment, User, TaskState } from '../api';
import { Loader2, X, MessageSquare, Clock, User2, AlignLeft, ChevronRight, Activity, Paperclip, FileIcon, Download, ShieldCheck, Stars, Link2, ShieldAlert, Database, Trash2, Upload } from 'lucide-react';
import { getWsUrl } from '../config';


const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

type TabType = 'details' | 'comments' | 'refs' | 'time';

export default function TaskDetailModal({ taskId, onClose, me }: { taskId: number; onClose: () => void, me: User | null }) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [attachments, setAttachments] = useState<WorkItemAttachment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [states, setStates] = useState<TaskState[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [timeLogObj, setTimeLogObj] = useState({ minutes: '', note: '' });
  const [addingTime, setAddingTime] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      api.getTask(taskId),
      api.getComments(taskId),
      api.getTimeLogs(taskId),
      api.getAssignableUsers().catch(() => ({ data: [] })),
      api.getStates(),
      api.getAttachments(taskId).catch(() => ({ data: [] })),
      api.getActivity().catch(() => ({ data: [] })),
    ])
      .then(([tRes, cRes, tlRes, uRes, sRes, aRes, actRes]) => {
        setTask(tRes.data);
        setComments(cRes.data);
        setTimeLogs(tlRes.data);
        setUsers(uRes.data);
        setStates(sRes.data);
        setAttachments(aRes.data);
        if (actRes && actRes.data) {
          setActivities(actRes.data.filter((a: any) => a.entity_type === 'work_item' && a.entity_id === taskId.toString()));
        }
      })
      .finally(() => setIsLoading(false));
  }, [taskId]);

  useEffect(() => { 
    loadData(); 
    api.recordView(taskId).catch(() => {});
  }, [taskId, loadData]);

  useEffect(() => {
    const wsUrl = getWsUrl(`/ws/tasks/${taskId}/`);
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'comment') {
          setComments(prev => {
            if (prev.find(c => c.id === payload.data.id)) return prev;
            return [...prev, payload.data];
          });
        }
      } catch (err) {
        console.error("Task WS error", err);
      }
    };

    return () => ws.close();
  }, [taskId]);

  const handleUpdateField = async (field: string, value: string | number | boolean | null) => {
    const oldTask = task;
    if (task) {
      const updatedTask = { ...task, [field]: value };
      if (field === 'state') {
        const foundState = states.find(s => s.id === value);
        if (foundState) {
          updatedTask.state_slug = foundState.slug;
          updatedTask.state__name = foundState.name;
        }
      }
      setTask(updatedTask);
    }
    window.dispatchEvent(new CustomEvent('cp-task-updated'));

    // Fix: Ensure empty strings for dates are sent as null to satisfy Django DateField
    let cleanValue = value;
    if ((field === 'posting_date' || field === 'due_date' || field === 'deadline' || field === 'scheduled_date') && value === '') {
      cleanValue = null;
    }

    try {
      await api.updateTask(taskId, { [field]: cleanValue });
      api.getTask(taskId).then(res => setTask(res.data)).catch(() => {});
    } catch (e) {
      console.error('Failed to update task', e);
      setTask(oldTask);
      window.dispatchEvent(new CustomEvent('cp-task-updated'));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await api.createComment({ work_item: taskId, body: newComment });
      setNewComment('');
      const cRes = await api.getComments(taskId);
      setComments(cRes.data);
      setActiveTab('comments');
    } finally {
      setAddingComment(false);
    }
  };

  const handleAddTimeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeLogObj.minutes) return;
    setAddingTime(true);
    try {
      await api.createTimeLog({ work_item: taskId, minutes: Number(timeLogObj.minutes), note: timeLogObj.note, logged_at: new Date().toISOString() });
      setTimeLogObj({ minutes: '', note: '' });
      const tlRes = await api.getTimeLogs(taskId);
      setTimeLogs(tlRes.data);
      setActiveTab('time');
    } finally {
      setAddingTime(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('work_item', taskId.toString());
    formData.append('file', file);
    formData.append('file_name', file.name);
    if (me?.id) formData.append('uploaded_by', me.id.toString());
    
    setIsUploading(true);
    try {
      await api.createAttachment(formData);
      const aRes = await api.getAttachments(taskId);
      setAttachments(aRes.data);
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!task) return null;

  const totalTime = timeLogs.reduce((acc, tl) => acc + tl.minutes, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full lg:max-w-4xl h-full lg:h-[90vh] lg:rounded-2xl border border-primary/30 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        
        <div className="flex items-start justify-between p-6 border-b border-border/50 bg-surface/30">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{task.task_code}</code>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize border ${PRIORITY_COLORS[task.priority] || 'bg-surface'}`}>
                {task.priority} Priority
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-surface rounded-full text-text-muted border border-border">
                {task.module_slug}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-text leading-tight flex items-center gap-3">
              {task.title}
              {task.is_client_approved && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-widest animate-in zoom-in duration-500">
                  <ShieldCheck className="w-4 h-4" /> Client Approved
                </div>
              )}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          <div className="flex-1 flex flex-col border-r border-border/50 bg-background/50">
            <div className="flex px-4 lg:px-6 border-b border-border/50 pt-2 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'details', label: 'Details', icon: <AlignLeft className="w-4 h-4" /> },
                { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" />, count: comments.length },
                { id: 'refs', label: 'References', icon: <Paperclip className="w-4 h-4" />, count: attachments.length },
                { id: 'time', label: 'Time Logs', icon: <Clock className="w-4 h-4" />, count: timeLogs.length },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                  }`}
                >
                  {t.icon} {t.label}
                  {t.count !== undefined && <span className="ml-1 text-[10px] bg-surface/50 px-1.5 py-0.5 rounded-full">{t.count}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-text-muted uppercase mb-3 flex items-center gap-2"><AlignLeft className="w-4 h-4" /> Description</h3>
                    {task.description ? (
                      <div className="glass p-4 rounded-xl text-sm whitespace-pre-wrap">{task.description}</div>
                    ) : (
                      <p className="text-sm text-text-muted italic">No description provided.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-muted uppercase mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Execution Timeline</h3>
                    <div className="space-y-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                      <div className="pl-8 relative flex flex-col">
                        <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border border-background"></div>
                        <p className="text-xs text-text font-medium">Task Created</p>
                        <p className="text-[10px] text-text-muted font-mono">{new Date(task.created_at).toLocaleString()}</p>
                      </div>
                      
                      {activities.map((act: any) => {
                        const date = new Date(act.created_at);
                        const h = date.getHours();
                        const m = date.getMinutes();
                        const timeVal = h + m / 60;
                        const isOvertime = timeVal < 9.0 || timeVal > 18.0;
                        
                        return (
                          <div key={act.id} className="pl-8 relative flex flex-col gap-0.5 animate-in slide-in-from-left-2 duration-200">
                            <div className={`absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border border-background ${isOvertime ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-primary'}`}></div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-text capitalize">{act.action}</span>
                              <span className="text-[10px] text-text-muted font-mono">{date.toLocaleString()}</span>
                              {isOvertime && (
                                <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 animate-pulse">
                                  After-Hours Work
                                </span>
                              )}
                            </div>
                            {act.user && (
                              <p className="text-[10px] text-text-muted">Executed by {act.user.first_name || act.user.email}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4 mb-4">
                    {comments.length === 0 && <p className="text-text-muted text-sm text-center py-8">No comments yet. Be the first to start the discussion!</p>}
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-4 group">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                          {c.author?.first_name?.charAt(0) || c.author?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 group/comment">
                          <div className="flex items-start gap-2">
                            <div className="glass p-4 rounded-2xl rounded-tl-none border border-border/50 inline-block relative">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{c.author?.first_name || c.author?.email}</span>
                                <span className="text-xs text-text-muted">{new Date(c.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                            </div>
                            {(me?.is_superuser || me?.role === 'admin' || me?.id === c.author?.id) && (
                              <button 
                                onClick={async () => {
                                  if (confirm('Delete this comment?')) {
                                    await api.deleteComment(c.id);
                                    loadData();
                                  }
                                }}
                                className="p-2 text-text-muted hover:text-error opacity-0 group-hover/comment:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddComment} className="glass p-2 pl-4 rounded-2xl border border-primary/30 flex items-end gap-2 shrink-0">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type your comment..." className="flex-1 bg-transparent resize-none outline-none py-2 text-sm min-h-[44px] max-h-[120px]" rows={1} />
                    <button type="submit" disabled={addingComment || !newComment.trim()} className="p-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl hover:opacity-90 disabled:opacity-50">
                      {addingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'time' && (
                <div className="flex flex-col h-full">
                  <div className="mb-6 flex items-center justify-between glass p-4 rounded-xl border border-border">
                    <div>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-wide">Total Time Logged</p>
                      <p className="text-2xl font-black text-primary mt-1">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
                    </div>
                    <Clock className="w-8 h-8 text-primary/20" />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                    {timeLogs.length === 0 && <p className="text-text-muted text-sm text-center py-4">No time logged against this task yet.</p>}
                    {timeLogs.map(tl => (
                      <div key={tl.id} className="glass p-3 rounded-xl border border-border/50 flex items-center justify-between group/timelog">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-medium">{tl.note || 'No description'}</p>
                            <p className="text-xs text-text-muted mt-0.5">{tl.user?.first_name || tl.user?.email} • {new Date(tl.created_at).toLocaleDateString()}</p>
                          </div>
                          {(me?.is_superuser || me?.role === 'admin' || me?.id === tl.user?.id) && (
                            <button 
                              onClick={async () => {
                                if (confirm('Delete this time log?')) {
                                  await api.deleteTimeLog(tl.id);
                                  loadData();
                                }
                              }}
                              className="p-1.5 text-text-muted hover:text-error opacity-0 group-hover/timelog:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="font-mono text-sm font-bold">{Math.floor(tl.minutes / 60)}h {tl.minutes % 60}m</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddTimeLog} className="glass p-4 rounded-2xl border border-border/80 shrink-0">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Time Log</h4>
                    <div className="flex gap-3">
                      <input type="number" required min="1" value={timeLogObj.minutes} onChange={e => setTimeLogObj({...timeLogObj, minutes: e.target.value})} placeholder="Minutes (e.g. 90)" className="w-32 px-3 py-2 bg-surface text-sm rounded-xl border border-border outline-none focus:border-primary" />
                      <input type="text" value={timeLogObj.note} onChange={e => setTimeLogObj({...timeLogObj, note: e.target.value})} placeholder="What did you work on?" className="flex-1 px-3 py-2 bg-surface text-sm rounded-xl border border-border outline-none focus:border-primary" />
                      <button type="submit" disabled={addingTime || !timeLogObj.minutes} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">Log</button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'refs' && (
                <div className="flex flex-col h-full">
                  <div className="mb-6 flex flex-col md:flex-row items-center gap-4 glass p-4 rounded-2xl border border-border/50">
                    <div className="flex-1">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5" /> Project Reference Link
                      </h4>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Paste cloud storage links, brand guides, or asset briefs here.</p>
                    </div>
                    <div className="w-full md:w-auto min-w-[300px] flex gap-2">
                      <textarea 
                        placeholder="https://drive...&#10;https://frame.io/..." 
                        value={task.reference_link || ''}
                        onChange={e => handleUpdateField('reference_link', e.target.value)}
                        rows={3}
                        className="flex-1 px-4 py-2 bg-surface border border-border rounded-xl text-xs focus:border-primary outline-none transition-all shadow-sm custom-scrollbar"
                      />
                    </div>
                  </div>

                  <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 glass p-4 rounded-2xl border border-border/50">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                        <FileIcon className="w-3.5 h-3.5" /> File Attachments
                      </h4>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Upload specific files or assets directly to this task.</p>
                    </div>
                    <div>
                      <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                      <label htmlFor="file-upload" className={`flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-primary hover:text-white transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                    {attachments.length === 0 && !task.reference_link && (
                      <div className="text-center py-12 px-6 glass rounded-2xl border border-border/50 border-dashed">
                        <Paperclip className="w-10 h-10 mx-auto text-text-muted mb-3 opacity-50" />
                        <h4 className="font-bold text-lg mb-1">No references yet</h4>
                        <p className="text-text-muted text-sm">Upload creative assets starting point here.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      {(task.reference_link ? task.reference_link.split(/(?=https?:\/\/)/).flatMap(s => s.split(/[\s,]+/)).map(s => s.trim()).filter(s => s.length > 0 && s.startsWith('http')) : []).map((link, idx) => (
                        <a href={link} target="_blank" rel="noopener noreferrer" key={`link-${idx}`} className="glass p-3 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary transition-colors flex items-center gap-4 group">
                          <div className="p-3 bg-primary/20 text-primary rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                            <Stars className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-text truncate">Reference Link {idx + 1}</h4>
                            <p className="text-xs text-text-muted mt-0.5 truncate">{link}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors shrink-0 mx-2" />
                        </a>
                      ))}
                      {attachments.map(a => (
                        <a href={a.file} target="_blank" rel="noopener noreferrer" key={a.id} className="glass p-3 rounded-xl border border-border hover:border-primary/50 transition-colors flex items-center gap-4 group">
                          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                            <FileIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-text truncate">{a.file_name}</h4>
                            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                              {a.uploaded_by?.first_name || a.uploaded_by?.email} • {new Date(a.created_at).toLocaleDateString()}
                              {a.size_bytes && <span> • {(a.size_bytes / 1024).toFixed(0)} KB</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                             <a href={a.file} target="_blank" rel="noopener noreferrer" title="Download Asset" className="p-2 text-text-muted hover:text-primary transition-colors">
                               <Download className="w-5 h-5" />
                             </a>
                             {(me?.is_superuser || me?.role === 'admin' || me?.id === a.uploaded_by?.id) && (
                               <button 
                                 onClick={async (e) => {
                                   e.preventDefault();
                                   if (confirm('Delete this attachment?')) {
                                     await api.deleteAttachment(a.id);
                                     loadData();
                                   }
                                 }}
                                 className="p-2 text-text-muted hover:text-error transition-colors"
                               >
                                 <Trash2 className="w-5 h-5" />
                               </button>
                             )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-72 bg-surface/10 lg:shrink-0 p-6 overflow-y-auto space-y-6 border-t lg:border-t-0 border-border/50 flex flex-col gap-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full"></div> Status / Workflow
              </label>
              <select 
                value={task.state} 
                onChange={e => handleUpdateField('state', Number(e.target.value))}
                className={`w-full px-3 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-all shadow-sm ${task.state_slug === 'client-review' ? 'border-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'border-border focus:border-primary'}`}
              >
                {states
                  .filter(s => {
                    if (me?.role !== 'specialist') return true; // Managers see all states
                    // Specialists cannot skip to Client Review or Completed
                    return !['client-review', 'completed-launched', 'archived'].includes(s.slug);
                  })
                  .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {task.state_slug === 'team-head-review' && (me?.role === 'admin' || me?.role === 'team_head') && (
              <div className="pt-2 animate-in slide-in-from-top-2 flex flex-col gap-2">
                <button 
                  onClick={async () => {
                    const nextState = states.find(s => s.slug === 'client-review');
                    if (nextState) handleUpdateField('state', nextState.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Approve for Client
                </button>
                <button 
                  onClick={async () => {
                    const reworkState = states.find(s => s.slug === 'rework-revision');
                    if (reworkState) handleUpdateField('state', reworkState.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
                >
                  Reject / Rework
                </button>
              </div>
            )}

            {task.state_slug === 'client-review' && !task.is_client_approved && (me?.role === 'admin' || me?.role === 'project_manager') && (
              <div className="pt-2 animate-in slide-in-from-top-2 flex flex-col gap-2">
                <button 
                  onClick={() => handleUpdateField('is_client_approved', true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all"
                >
                  <Stars className="w-4 h-4" /> Mark Client Approved
                </button>
                <button 
                  onClick={async () => {
                    const completedState = states.find(s => s.slug === 'completed-launched');
                    if (completedState) handleUpdateField('state', completedState.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all"
                >
                  Bypass & Launch
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-500 rounded-full"></div> Assignee
              </label>
              <select 
                value={task.assignee?.id || ''} 
                onChange={e => handleUpdateField('assignee_id', e.target.value ? Number(e.target.value) : null)}
                disabled={users.length === 0}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(me?.role === 'admin' || me?.role === 'project_manager') ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> Post Date
                  </label>
                  <input 
                    type="date"
                    value={task.posting_date || ''}
                    onChange={e => handleUpdateField('posting_date', e.target.value || null)}
                    className="w-full px-2 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-xs focus:border-indigo-500 outline-none hover:border-indigo-500/50 transition-colors font-bold"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-50"></div> Post Date
                  </label>
                  <div className="w-full px-2 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs font-mono text-indigo-400/80">
                    {task.posting_date || 'Not set'}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Deadline
                </label>
                <input 
                  type="date"
                  value={task.deadline || ''}
                  onChange={e => handleUpdateField('deadline', e.target.value || null)}
                  className="w-full px-2 py-2 bg-red-500/5 border border-red-500/20 rounded-lg text-xs focus:border-red-500 outline-none hover:border-red-500/50 transition-colors font-bold"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Due Date
                </label>
                <input 
                  type="date"
                  value={task.due_date || ''}
                  onChange={e => handleUpdateField('due_date', e.target.value || null)}
                  className="w-full px-2 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs focus:border-amber-500 outline-none hover:border-amber-500/50 transition-colors font-bold"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Task Start
                </label>
                <input 
                  type="date"
                  value={task.scheduled_date || ''}
                  onChange={e => handleUpdateField('scheduled_date', e.target.value || null)}
                  className="w-full px-2 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs focus:border-emerald-500 outline-none hover:border-emerald-500/50 transition-colors font-bold"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Reference Link
              </label>
              <textarea 
                value={task.reference_link || ''}
                onChange={e => handleUpdateField('reference_link', e.target.value || null)}
                placeholder="Paste links here (separated by newlines)..."
                rows={3}
                className="w-full px-3 py-2.5 bg-surface/50 border border-border rounded-xl text-xs focus:border-primary outline-none hover:border-primary/50 transition-colors custom-scrollbar"
              />
            </div>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Action Matrix
              </label>
              <div className="space-y-2">
                {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'sales_manager') && (
                  <button 
                    onClick={async () => {
                      if (confirm('Archive this task? It will be removed from active boards.')) {
                        await api.deleteTask(task.id);
                        onClose();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                  >
                    <Database className="w-4 h-4" /> Archive Task
                  </button>
                )}
                {(me?.is_superuser || me?.role === 'admin') && (
                  <button 
                    onClick={async () => {
                      if (confirm('💣 PERMANENT DELETE: This cannot be undone. All logs and comments will be erased. Continue?')) {
                        await api.deleteTask(task.id);
                        onClose();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> Hard Delete
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Task Created</label>
                <div className="text-[11px] font-bold text-text-muted mt-1 px-1 flex items-center gap-2">
                  <Activity className="w-3 h-3 opacity-50" />
                  {new Date(task.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ownership</label>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-text">{task.created_by?.first_name || 'System'}</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
  );
}

const Plus = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);
