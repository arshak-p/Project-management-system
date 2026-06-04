import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, Clock, Briefcase, FileText, Database, Search, User as UserIcon } from 'lucide-react';
import type { User, Activity } from '../api';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ActivityPage({ me: _me }: { me: User | null }) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const load = useCallback(() => {
        api.getActivity()
            .then(r => setActivities(r.data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

    const filtered = activities.filter(a => 
        a.action.toLowerCase().includes(filter.toLowerCase()) ||
        a.entity_type.toLowerCase().includes(filter.toLowerCase()) ||
        (a.user?.email || '').toLowerCase().includes(filter.toLowerCase())
    );

    const getIcon = (type: string) => {
        switch (type) {
            case 'project': return <Briefcase className="w-4 h-4" />;
            case 'work_item': return <FileText className="w-4 h-4" />;
            case 'comment': return <ActivityIcon className="w-4 h-4" />;
            default: return <Database className="w-4 h-4" />;
        }
    };

    const getActionColor = (action: string) => {
        if (action === 'created') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (action === 'deactivated') return 'text-error bg-error/10 border-error/20';
        if (action === 'updated') return 'text-primary bg-primary/10 border-primary/20';
        return 'text-text-muted bg-white/5 border-white/10';
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
            />
        </div>
    );

    return (
        <div className="space-y-10 pb-24 font-inter">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter">System Audit Log</h1>
                    <p className="text-text-muted mt-2 font-bold tracking-widest uppercase text-[10px] opacity-60 italic">Immutable Evidence Feed // Active</p>
                </div>
                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                    <input 
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Search logs (e.g. deactivated, user email)..."
                        className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-[1.5rem] text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bento-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/40">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 italic">Timestamp</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 italic">Actor</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 italic">Entity</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 italic">Action Type</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 italic">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filtered.map((a) => (
                                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3 text-text-muted font-bold text-xs">
                                            <Clock className="w-3.5 h-3.5 opacity-40" />
                                            {new Date(a.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase text-primary">
                                                {a.user?.first_name?.[0] || <UserIcon className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black truncate">{a.user?.first_name || 'System'}</p>
                                                <p className="text-[10px] font-medium text-text-muted truncate">{a.user?.email || 'automated_event'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-xl text-text-muted group-hover:text-primary transition-colors">
                                                {getIcon(a.entity_type)}
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60">{a.entity_type.replace('_', ' ')}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black bg-surface uppercase tracking-widest border ${getActionColor(a.action)}`}>
                                            {a.action}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="max-w-xs">
                                            <p className="text-xs font-bold text-text-muted line-clamp-1 italic">
                                                {(a.payload as Record<string, string>)?.name || (a.payload as Record<string, string>)?.title || (a.payload as Record<string, string>)?.task_code || `Record ID: ${a.entity_id}`}
                                            </p>
                                            {a.project_name && (
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mt-1">{a.project_name}</p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filtered.length === 0 && (
                    <div className="p-20 text-center">
                        <Database className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                        <p className="text-text-muted font-bold italic">No log entries found for this sector.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
