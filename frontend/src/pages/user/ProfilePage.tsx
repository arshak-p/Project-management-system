import { useEffect, useState } from 'react';
import { api, API_URL } from '../../api';
import type { User } from '../../api';
import { User2, Mail, Phone, Briefcase, Save, Loader2, CheckCircle2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: '🔴 Admin',
  team_head: '⭐ Team Head',
  team_member: '👤 Team Member',
  sales_manager: '💰 Sales Manager',
  client: '🏢 Client',
};

export default function ProfilePage({ me: _me }: { me: User | null }) {
  const [me, setMe] = useState<User | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', title: '', phone: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getMe().then(r => {
      setMe(r.data);
      setForm({
        first_name: r.data.first_name || '',
        last_name: r.data.last_name || '',
        title: r.data.title || '',
        phone: r.data.phone || '',
      });
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/users/${me.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const initials = me?.first_name
    ? `${me.first_name.charAt(0)}${me.last_name?.charAt(0) || ''}`.toUpperCase()
    : me?.email?.charAt(0)?.toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-text-muted mt-1">Update your personal information and account details.</p>
      </div>

      {/* Profile Header */}
      <div className="glass rounded-2xl border border-border p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] flex-shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {me?.first_name ? `${me.first_name} ${me.last_name || ''}`.trim() : 'Set your name below'}
          </h2>
          <p className="text-text-muted text-sm flex items-center gap-1.5 mt-1">
            <Mail className="w-3.5 h-3.5" /> {me?.email}
          </p>
          <span className="inline-block mt-2 px-3 py-1 glass border border-border rounded-full text-xs font-semibold text-primary">
            {me?.role ? (ROLE_LABELS[me.role] || me.role) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Read-only Info */}
      <div className="glass rounded-2xl border border-border p-6 space-y-4">
        <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider">Account Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface/50 rounded-xl p-3 border border-border/50">
            <p className="text-xs text-text-muted mb-1">Username</p>
            <p className="text-sm font-semibold font-mono">@{me?.username}</p>
          </div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border/50">
            <p className="text-xs text-text-muted mb-1">Role</p>
            <p className="text-sm font-semibold capitalize">{(me?.role || '').replace('_', ' ')}</p>
          </div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border/50">
            <p className="text-xs text-text-muted mb-1">Account Status</p>
            <p className={`text-sm font-bold ${me?.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {me?.is_active ? '🟢 Active' : '🔴 Inactive'}
            </p>
          </div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border/50">
            <p className="text-xs text-text-muted mb-1">Member since</p>
            <p className="text-sm font-semibold">{me?.date_joined ? new Date(me.date_joined).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="glass rounded-2xl border border-border p-6 space-y-5">
        <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider">Edit Profile</h3>

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">First Name</label>
            <div className="relative">
              <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="First name" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Last Name</label>
            <div className="relative">
              <User2 className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job Title</label>
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Designer" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Phone Number</label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:border-primary outline-none" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 shadow-[0_5px_15px_-5px_rgba(59,130,246,0.5)]">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
