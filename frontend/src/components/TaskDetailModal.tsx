import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Task, TaskComment, TimeLog, WorkItemAttachment, User, TaskState } from '../api';
import { Loader2, X, MessageSquare, Clock, User2, AlignLeft, ChevronRight, Activity, Paperclip, FileIcon, Download, ShieldCheck, Stars } from 'lucide-react';
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [uploading, setUploading] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

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
    ])
      .then(([tRes, cRes, tlRes, uRes, sRes, aRes]) => {
        setTask(tRes.data);
        setComments(cRes.data);
        setTimeLogs(tlRes.data);
        setUsers(uRes.data);
        setStates(sRes.data);
        setAttachments(aRes.data);
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
    try {
      await api.updateTask(taskId, { [field]: value });
      loadData();
    } catch (e) {
      console.error('Failed to update task', e);
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
    setUploading(true);
    const formData = new FormData();
    formData.append('work_item', taskId.toString());
    formData.append('file', file);
    try {
      await api.createAttachment(formData);
      const aRes = await api.getAttachments(taskId);
      setAttachments(aRes.data);
      setActiveTab('refs');
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full max-w-4xl h-[90vh] rounded-2xl border border-primary/30 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        
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

        <div className="flex flex-1 overflow-hidden">
          
          <div className="flex-1 flex flex-col border-r border-border/50 bg-background/50">
            <div className="flex px-6 border-b border-border/50 pt-2 shrink-0">
              {[
                { id: 'details', label: 'Details', icon: <AlignLeft className="w-4 h-4" /> },
                { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" />, count: comments.length },
                { id: 'refs', label: 'References', icon: <Paperclip className="w-4 h-4" />, count: attachments.length },
                { id: 'time', label: 'Time Logs', icon: <Clock className="w-4 h-4" />, count: timeLogs.length },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                  }`}
                >
                  {t.icon} {t.label}
                  {t.count !== undefined && <span className="ml-1 text-xs bg-surface/50 px-1.5 py-0.5 rounded-full">{t.count}</span>}
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
                    <h3 className="text-sm font-bold text-text-muted uppercase mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Activity</h3>
                    <p className="text-xs text-text-muted">Task created on {new Date(task.created_at).toLocaleString()}</p>
                    <p className="text-xs text-text-muted mt-1">Last updated on {new Date(task.updated_at).toLocaleString()}</p>
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
                        <div className="flex-1">
                          <div className="glass p-4 rounded-2xl rounded-tl-none border border-border/50 inline-block">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{c.author?.first_name || c.author?.email}</span>
                              <span className="text-xs text-text-muted">{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
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
                      <div key={tl.id} className="glass p-3 rounded-xl border border-border/50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{tl.note || 'No description'}</p>
                          <p className="text-xs text-text-muted mt-0.5">{tl.user?.first_name || tl.user?.email} • {new Date(tl.created_at).toLocaleDateString()}</p>
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
                  <div className="mb-6 flex items-center justify-between glass p-4 rounded-xl border border-border">
                    <div>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-wide">Project References</p>
                      <p className="text-sm text-text mt-0.5">Attach branding files, social assets, and briefs.</p>
                    </div>
                    <label className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      Upload File
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                    {attachments.length === 0 && (
                      <div className="text-center py-12 px-6 glass rounded-2xl border border-border/50 border-dashed">
                        <Paperclip className="w-10 h-10 mx-auto text-text-muted mb-3 opacity-50" />
                        <h4 className="font-bold text-lg mb-1">No references yet</h4>
                        <p className="text-text-muted text-sm">Upload creative assets starting point here.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      {attachments.map(a => (
                        <a href={a.file} target="_blank" rel="noreferrer" key={a.id} className="glass p-3 rounded-xl border border-border hover:border-primary/50 transition-colors flex items-center gap-4 group">
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
                          <Download className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors shrink-0 mx-2" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-72 bg-surface/20 shrink-0 p-6 overflow-y-auto space-y-6">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Status / Workflow</label>
              <select 
                value={task.state} 
                onChange={e => handleUpdateField('state', Number(e.target.value))}
                className={`w-full px-3 py-2 bg-surface border rounded-xl text-sm outline-none transition-all ${task.state_slug === 'client-review' ? 'border-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-border focus:border-primary'}`}
              >
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {task.state_slug === 'client-review' && !task.is_client_approved && (me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'team_head') && (
              <div className="pt-2 animate-in slide-in-from-top-2">
                <button 
                  onClick={() => handleUpdateField('is_client_approved', true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all"
                >
                  <Stars className="w-4 h-4" /> Approve for Client
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Assignee</label>
              <select 
                value={task.assignee?.id || ''} 
                onChange={e => handleUpdateField('assignee_id', e.target.value ? Number(e.target.value) : null)}
                disabled={users.length === 0}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.email}</option>)}
              </select>
              {users.length === 0 && task.assignee && (
                <p className="text-xs mt-1 text-primary">{task.assignee.first_name || task.assignee.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Due Date</label>
              <input 
                type="date"
                value={task.due_date || ''}
                onChange={e => handleUpdateField('due_date', e.target.value || null)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none hover:border-primary/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Scheduled Work Date
              </label>
              <input 
                type="date"
                value={task.scheduled_date || ''}
                onChange={e => handleUpdateField('scheduled_date', e.target.value || null)}
                className="w-full px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl text-sm focus:border-primary outline-none hover:border-primary/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              <p className="text-[10px] text-text-muted leading-tight">When do you plan to work on this before the deadline?</p>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-border/50">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Created By</label>
              <div className="flex items-center gap-2 mt-1">
                <User2 className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium">{task.created_by?.first_name || 'System User'}</span>
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
