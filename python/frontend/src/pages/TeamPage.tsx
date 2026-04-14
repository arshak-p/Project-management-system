import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loader2, Users, Shield, User2, Mail, Plus, X, Phone, Briefcase, Eye, EyeOff, Trash2 } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400 bg-red-400/10 border-red-400/20',
  project_manager: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  team_head: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  specialist: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  sales_manager: 'text-green-400 bg-green-400/10 border-green-400/20',
  client: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const ROLES = [
  { value: 'specialist', label: '👤 Specialist / Creator' },
  { value: 'project_manager', label: '🎯 Project Manager' },
  { value: 'team_head', label: '⭐ Team Head' },
  { value: 'admin', label: '🔴 Admin' },
  { value: 'sales_manager', label: '💰 Sales Manager' },
  { value: 'client', label: '🏢 Client' },
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
};

export default function TeamPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => {
    api.getUsers()
      .then(r => setUsers(r.data))
      .catch(err => console.error('Fetching issue on Team Page:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.createUser(form);
      setSuccess(`✅ Member "${form.first_name || form.email}" added successfully!`);
      setForm(defaultForm);
      load();
      setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.join(' ') : detail || 'Failed to create member.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team member? This cannot be undone.')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err: any) {
      alert('Failed to delete member.');
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

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-lg rounded-2xl border border-primary/30 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#8b5cf6] rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Add Team Member</h3>
                  <p className="text-xs text-text-muted">Create a new account for your team</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setError(''); setForm(defaultForm); }} className="p-2 hover:bg-surface rounded-xl text-text-muted hover:text-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error animate-in fade-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 animate-in fade-in">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">First Name</label>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Arshak" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last Name</label>
                  <div className="relative">
                    <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Pulikkal" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Email Address <span className="text-error">*</span></label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="member@colourparrot.com" required className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Password <span className="text-error">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-text-muted hover:text-text">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job Title</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Designer" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(''); setForm(defaultForm); }} className="flex-1 py-2.5 glass border border-border hover:border-primary/40 text-sm rounded-xl font-medium transition-colors text-text-muted hover:text-text">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)]">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Add Member</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Directory</h1>
          <p className="text-text-muted mt-1">{users.length} member{users.length !== 1 ? 's' : ''} across all departments.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl font-medium shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)] hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Role Stats */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(roleStats).map(([role, count]) => (
          <span key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[role] || 'text-text-muted bg-surface/50 border-border'}`}>
            <Shield className="w-3 h-3" /> {role.replace('_', ' ')} ({count})
          </span>
        ))}
      </div>

      {/* Search */}
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
            <div key={user.id} className="glass rounded-2xl border border-border/50 hover:border-primary/30 transition-all group overflow-hidden relative">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} 
                className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all z-10"
                title="Delete Member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
                  <div>
                    <p className="text-xs text-text-muted">Status</p>
                    <span className={`text-xs font-bold ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Joined</p>
                    <p className="text-xs font-medium">{new Date(user.date_joined).toLocaleDateString()}</p>
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
