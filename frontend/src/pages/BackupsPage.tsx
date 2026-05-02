import { useState, useEffect } from 'react';
import { api } from '../api';
import type { User } from '../api';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Clock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface Backup {
  id: number;
  month: string;
  created_at: string;
  is_approved: boolean;
  approved_at: string | null;
  approved_by_details: {
    first_name?: string;
    last_name?: string;
  } | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BackupsPage({ me: _me }: { me: User | null }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await api.getBackups();
      setBackups(res.data);
    } catch (err) {
      console.error("Failed to fetch backups", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAndDownload = async (id: number, month: string) => {
    setIsProcessing(id);
    try {
      const res = await api.approveAndDownloadBackup(id);
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${month}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Refresh list to show approved status
      fetchBackups();
    } catch (err) {
      console.error("Download error", err);
      alert("Failed to process download. Please try again.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">Agency Data Backups</h1>
          <p className="text-sm text-text-muted">Monthly project snapshots ready for your approval and local download.</p>
        </div>
        <div className="p-4 glass rounded-[2rem] flex items-center gap-4 border-primary/20 w-full md:w-auto">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Security Protocol</p>
            <p className="text-sm font-bold">Admin Permission Required</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <div className="glass p-20 rounded-[3rem] text-center border-dashed border-2 border-white/5">
            <Clock className="w-16 h-16 text-text-muted mx-auto mb-6 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No backups pending</h3>
            <p className="text-text-muted">The system will automatically generate a request on the 1st of every month.</p>
          </div>
        ) : (
          backups.map((backup) => (
            <motion.div 
              key={backup.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8 rounded-[2.5rem] border-white/5 flex flex-col md:flex-row items-center justify-between hover:border-primary/20 transition-all group"
            >
              <div className="flex items-center gap-8 mb-6 md:mb-0">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors duration-500 ${backup.is_approved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]'}`}>
                  {backup.is_approved ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black tracking-tight">{backup.month}</h3>
                    {backup.is_approved && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">Downloaded</span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted">
                    {backup.is_approved 
                      ? `Approved by ${backup.approved_by_details?.first_name || 'Admin'} on ${new Date(backup.approved_at!).toLocaleDateString()}` 
                      : 'Waiting for Agency Manager approval'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  disabled={isProcessing === backup.id}
                  onClick={() => handleApproveAndDownload(backup.id, backup.month)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50
                    ${!backup.is_approved 
                      ? 'bg-primary text-white hover:shadow-glow' 
                      : 'glass border-white/10 hover:bg-white/10 text-text'}
                  `}
                >
                  {isProcessing === backup.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {backup.is_approved ? 'Download Again' : 'Approve & Download'}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {!isLoading && backups.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-sm text-amber-200/60 leading-relaxed">
            <p className="font-bold text-amber-400/80 mb-1">Data Sovereignty Notice</p>
            By clicking "Approve & Download", the system will package all project tasks, effort logs, and client data into a ZIP archive and download it directly to your computer. Please handle these exports responsibly.
          </div>
        </motion.div>
      )}
    </div>
  );
}
