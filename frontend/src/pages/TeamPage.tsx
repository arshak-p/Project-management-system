import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { User, JobTitle } from '../api';
import { Loader2, Users, Shield, User2, Mail, Plus, X, Phone, Briefcase, Eye, EyeOff, Database, Pencil, CalendarRange, Copy, Check, TrendingUp } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400 bg-red-400/10 border-red-400/20',
  project_manager: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  team_head: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  specialist: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  sales_manager: 'text-green-400 bg-green-400/10 border-green-400/20',
  client: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  hr: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
};

const ROLES = [
  { value: 'specialist', label: '👤 Specialist / Creator' },
  { value: 'team_head', label: '⭐ Team Head' },
  { value: 'project_manager', label: '🎯 Project Manager' },
  { value: 'admin', label: '🔴 Admin' },
  { value: 'sales_manager', label: '💰 Sales Manager' },
  { value: 'hr', label: '🛡️ Human Resources' },
];

function getInitials(user: { first_name?: string; last_name?: string; email: string }) {
  if (user.first_name) return `${user.first_name.charAt(0)}${user.last_name?.charAt(0) || ''}`.toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

function getAvatarGradient(index: number) {
  const gradients = [
    'from-primary to-[#8b5cf6]',
    'from-orange-400 to-pink-500',
    'from-green-400 to-teal-500',
    'from-yellow-400 to-orange-500',
    'from-pink-400 to-red-500',
    'from-teal-400 to-cyan-500',
  ];
  return gradients[index % gradients.length];
}

const defaultForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'specialist',
  title: '',
  phone: '',
  date_joined: '',
  date_of_birth: '',
};

export default function TeamPage({ me }: { me: User | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);

  // OTP States
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyOtp = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendOtp = async () => {
    if (!form.email) {
      setError('Please provide an email address first.');
      return;
    }
    setIsSendingOtp(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.sendCreationOTP(form.email);
      setShowOtpField(true);
      
      // If the backend sent a fallback code (because mail failed)
      if (res.data?.otp_fallback) {
        setSuccess(`Manual Mode: ${res.data.detail}`);
      } else {
        setSuccess('Verification code sent to email!');
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setIsVerifyingOtp(true);
    setError('');
    try {
      await api.verifyCreationOTP(form.email, otp);
      setIsEmailVerified(true);
      setSuccess('Email address verified successfully!');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Invalid or expired code. Please check and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const load = useCallback(() => {
    Promise.all([
      api.getUsers({ archived: showArchived }),
      api.getJobTitles()
    ])
      .then(([u, jt]) => {
        setUsers(u.data);
        setJobTitles(jt.data);
      })
      .catch(err => console.error('Fetching issue on Team Page:', err))
      .finally(() => setIsLoading(false));
  }, [showArchived]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(form.email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!editingUser && !isEmailVerified) {
      setError('Please verify the email address before creating a new member.');
      return;
    }

    if (editingUser && isChangingPassword) {
      if (!form.password) {
        setError('Please enter a new password.');
        return;
      }
      if (form.password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSaving(true); setError(''); setSuccess('');
    
    // Sanitize empty strings to null to satisfy strict Django date validation
    const payload = { ...form } as Record<string, any>;
    if (!payload.date_joined) payload.date_joined = null;
    if (!payload.date_of_birth) payload.date_of_birth = null;
    if (editingUser && !isChangingPassword) {
      delete payload.password;
    }

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
        setSuccess(`✅ Member details updated successfully!`);
      } else {
        await api.createUser(payload);
        setSuccess(`✅ Member "${form.first_name || form.email}" added successfully!`);
      }
      setForm(defaultForm);
      setEditingUser(null);
      setIsChangingPassword(false);
      setConfirmPassword('');
      setIsEmailVerified(false);
      setShowOtpField(false);
      setOtp('');
      load();
      setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | string[]; error?: string | string[] } } })?.response?.data?.detail 
        || (err as { response?: { data?: { detail?: string | string[]; error?: string | string[] } } })?.response?.data?.error;
      setError(Array.isArray(detail) ? detail.join(' ') : (typeof detail === 'string' ? detail : 'Failed to save member.'));
    } finally { setSaving(false); }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      password: '',
      role: user.role,
      title: user.title || '',
      phone: user.phone || '',
      date_joined: user.date_joined ? new Date(user.date_joined).toISOString().split('T')[0] : '',
      date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
    });
    setIsChangingPassword(false);
    setConfirmPassword('');
    setShowModal(true);
  };

  const handleArchive = async (id: number) => {
    if (!confirm('Archive this team member? Access will be revoked immediately.')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch {
      alert('Failed to archive member.');
    }
  };

  const handleRestore = async (id: number) => {
    if (!confirm('Restore this team member to active status?')) return;
    try {
      await api.updateUser(id, { is_active: true });
      alert('Member restored to active duty.');
      load();
    } catch {
      alert('Failed to restore member. Permission denied.');
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleStats: Record<string, number> = {};
  users.forEach(u => { roleStats[u.role || 'specialist'] = (roleStats[u.role || 'specialist'] || 0) + 1; });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full lg:max-w-lg h-full lg:h-auto lg:rounded-2xl border border-primary/30 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#8b5cf6] rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{editingUser ? 'Update Member' : 'Add Team Member'}</h3>
                  <p className="text-xs text-text-muted">{editingUser ? 'Modify account details' : 'Create a new account for your team'}</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setError(''); setForm(defaultForm); setEditingUser(null); setIsChangingPassword(false); setConfirmPassword(''); }} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4" autoComplete="off">
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error animate-in fade-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-sm text-emerald-400 animate-in fade-in flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System Message</span>
                    <span className="font-bold">{success}</span>
                  </div>
                  {success.includes('CODE:') && (
                    <button 
                      type="button"
                      onClick={() => {
                        const code = success.split('CODE:')[1].trim().split(' ')[0];
                        handleCopyOtp(code);
                      }}
                      className="ml-4 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-tighter shadow-lg shadow-emerald-500/20"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">First Name</label>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input 
                      type="text"
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none transition-all" 
                      placeholder="John" 
                      value={form.first_name} 
                      onChange={e => setForm({ ...form, first_name: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last Name</label>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input type="text" autoComplete="off" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Email Address <span className="text-error">*</span></label>
                  {isEmailVerified ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      ✓ Email Verified
                    </span>
                  ) : form.email && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email) ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email) ? '✓ Valid Format' : '⚠ Invalid Email'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className={`w-4 h-4 absolute left-3 top-3 transition-colors ${form.email ? (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email) ? 'text-emerald-500' : 'text-amber-500') : 'text-text-muted'}`} />
                    <input 
                      type="email"
                      autoComplete="off"
                      disabled={isEmailVerified || !!editingUser}
                      className={`w-full pl-10 pr-4 py-2.5 bg-surface border rounded-xl text-sm outline-none transition-all ${isEmailVerified ? 'border-emerald-500/50 opacity-70' : form.email ? (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email) ? 'border-emerald-500/30 focus:border-emerald-500' : 'border-amber-500/30 focus:border-amber-500 ring-2 ring-amber-500/10') : 'border-border focus:border-primary'}`} 
                      placeholder="name@agency.com" 
                      value={form.email} 
                      onChange={e => setForm({ ...form, email: e.target.value })} 
                      required 
                    />
                  </div>
                  {!editingUser && !isEmailVerified && (
                    <button 
                      type="button"
                      disabled={isSendingOtp || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)}
                      onClick={handleSendOtp}
                      className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Code'}
                    </button>
                  )}
                </div>
              </div>

              {!editingUser && showOtpField && !isEmailVerified && (
                <div className="space-y-1.5 p-4 bg-primary/5 border border-primary/10 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Enter Verification Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      maxLength={6}
                      placeholder="6-digit key"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="flex-1 bg-surface border border-primary/20 rounded-xl px-4 py-2 text-center font-mono text-lg tracking-[0.5em] focus:border-primary outline-none"
                    />
                    <button 
                      type="button"
                      disabled={isVerifyingOtp || otp.length < 6}
                      onClick={handleVerifyOtp}
                      className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                </div>
              )}

              {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager') && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  {editingUser ? (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Account Security</label>
                        {!isChangingPassword && (
                          <button 
                            type="button" 
                            onClick={() => setIsChangingPassword(true)}
                            className="text-xs font-bold text-primary hover:text-[#8b5cf6] transition-colors"
                          >
                            + Change Password
                          </button>
                        )}
                      </div>
                      
                      {isChangingPassword && (
                        <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-wider">New Password</label>
                            <div className="relative">
                              <input 
                                type={showPassword ? 'text' : 'password'} 
                                autoComplete="new-password" 
                                value={form.password} 
                                onChange={e => setForm({ ...form, password: e.target.value })} 
                                placeholder="Min 8 characters" 
                                className="w-full pl-3 pr-8 py-2 bg-surface border border-border rounded-lg text-sm focus:border-primary outline-none" 
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-text-muted hover:text-text">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Confirm Password</label>
                            <input 
                              type={showPassword ? 'text' : 'password'} 
                              autoComplete="new-password" 
                              value={confirmPassword} 
                              onChange={e => setConfirmPassword(e.target.value)} 
                              placeholder="Re-type password" 
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-primary outline-none" 
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <button type="button" onClick={() => { setIsChangingPassword(false); setForm({...form, password: ''}); setConfirmPassword(''); }} className="text-[10px] uppercase font-bold text-text-muted hover:text-text transition-colors">
                              Cancel Password Change
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        Initial Password <span className="text-error">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          autoComplete="new-password" 
                          value={form.password} 
                          onChange={e => setForm({ ...form, password: e.target.value })} 
                          placeholder="Min 8 characters" 
                          required 
                          className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-text-muted hover:text-text">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Role</label>
                  <div className="relative">
                    <Shield className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none appearance-none">
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job Title / Designation</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <select 
                      value={form.title} 
                      onChange={e => setForm({ ...form, title: e.target.value })} 
                      className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none appearance-none"
                    >
                      <option value="">Select Designation</option>
                      {jobTitles.map(jt => (
                        <option key={jt.id} value={jt.name}>{jt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 00000 00000" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Official Joining Date</label>
                  <div className="relative">
                    <CalendarRange className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input 
                      type="date" 
                      value={form.date_joined} 
                      onChange={e => setForm({ ...form, date_joined: e.target.value })} 
                      className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" 
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                  <label className="text-xs font-semibold text-[#ec4899] uppercase tracking-wide">Date of Birth</label>
                  <div className="relative">
                    <CalendarRange className="w-4 h-4 absolute left-3 top-3 text-[#ec4899]" />
                    <input 
                      type="date" 
                      value={form.date_of_birth} 
                      onChange={e => setForm({ ...form, date_of_birth: e.target.value })} 
                      className="w-full pl-9 pr-3 py-2.5 bg-[#ec4899]/5 border border-[#ec4899]/20 rounded-xl text-sm focus:border-[#ec4899] outline-none" 
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(''); setForm(defaultForm); setIsChangingPassword(false); setConfirmPassword(''); }} className="flex-1 py-2.5 glass border border-border hover:border-primary/40 text-sm rounded-xl font-medium transition-colors text-text-muted hover:text-text">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)]">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>{editingUser ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingUser ? 'Update Member' : 'Add Member'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Team Directory</h1>
          <p className="text-sm text-text-muted mt-1">{users.length} member{users.length !== 1 ? 's' : ''} across all departments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          <label className="flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 glass px-5 py-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all text-xs font-bold">
            <Database className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-text-muted'}`} />
            <span className="uppercase tracking-widest text-[10px]">Archives</span>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="sr-only" />
            <div className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showArchived ? 'left-4.5' : 'left-0.5'}`}></div>
            </div>
          </label>
          {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'hr') && (
            <button onClick={() => setShowModal(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Add Member
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(roleStats).map(([role, count]) => (
          <span key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[role] || 'text-text-muted bg-surface/50 border-border'}`}>
            <Shield className="w-3 h-3" /> {role.replace('_', ' ')} ({count})
          </span>
        ))}
      </div>

      <div className="relative">
        <Users className="w-4 h-4 absolute left-4 top-3.5 text-text-muted" />
        <input type="text" placeholder="Search by name, email or role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-16 text-center">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No members found</h3>
          <p className="text-text-muted text-sm mb-4">Add your first team member to get started.</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl text-sm font-medium hover:opacity-90">
            Add First Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((user, i) => (
            <div key={user.id} className={`glass rounded-2xl border border-border/50 hover:border-primary/30 transition-all group overflow-hidden relative ${!user.is_active ? 'opacity-60 grayscale-[0.6]' : ''}`}>
              {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager') && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                   <button 
                    onClick={(e) => { e.stopPropagation(); openEdit(user); }} 
                    className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                    title="Edit Member"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                 {(me?.is_superuser || me?.role === 'admin' || me?.role === 'project_manager' || me?.role === 'hr') && (
                    user.is_active ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleArchive(user.id); }} 
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all"
                        title="Archive Member"
                      >
                        <Database className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRestore(user.id); }} 
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all"
                        title="Restore Member"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              )}
              <div className={`h-1 bg-gradient-to-r ${getAvatarGradient(i)}`}></div>
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(i)} flex items-center justify-center text-2xl font-black text-white mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
                  {getInitials(user)}
                </div>
                <h3 className="font-bold text-base text-text truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'No Name Set'}
                </h3>
                {user.title && <p className="text-xs text-primary font-medium mt-0.5">{user.title}</p>}
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Mail className="w-3 h-3 text-text-muted" />
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${ROLE_COLORS[user.role || 'specialist'] || 'text-text-muted bg-surface/50 border-border'}`}>
                  <User2 className="w-3 h-3" /> {(user.role || 'specialist').replace('_', ' ')}
                </span>
                <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-2 text-center">
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Efficiency</p>
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-black text-white">{user.efficiency ?? 0}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Status</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {user.is_active ? '🟢 Operational' : '🟡 Offline Log'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Joined</p>
                    <p className="text-xs font-medium">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
