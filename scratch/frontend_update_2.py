import re

with open('frontend/src/pages/TeamPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_vars = """  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingPayload, setPendingPayload] = useState<Record<string, any> | null>(null);"""
content = re.sub(r'  const \[editingUser, setEditingUser\] = useState<User \| null>\(null\);\n  const \[showArchived, setShowArchived\] = useState\(false\);\n  const \[jobTitles, setJobTitles\] = useState<JobTitle\[\]>\(\[\]\);', state_vars, content)

# 2. Add handleOtpSubmit
handle_otp_submit = """  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPayload || !otpCode) return;
    
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.createUser({ ...pendingPayload, otp: otpCode });
      setSuccess(`✅ Member "${pendingPayload.first_name || pendingPayload.email}" added successfully!`);
      setForm(defaultForm);
      setEditingUser(null);
      setIsChangingPassword(false);
      setConfirmPassword('');
      setOtpCode('');
      setPendingPayload(null);
      setShowOtpModal(false);
      load();
      setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | string[]; error?: string | string[] } } })?.response?.data?.detail 
        || (err as { response?: { data?: { detail?: string | string[]; error?: string | string[] } } })?.response?.data?.error;
      setError(Array.isArray(detail) ? detail.join(' ') : (typeof detail === 'string' ? detail : 'Failed to save member.'));
    } finally { setSaving(false); }
  };

  const handleSubmit"""
content = content.replace('  const handleSubmit', handle_otp_submit)

# 3. Update handleSubmit
old_try_block = """    try {
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
      load();
      setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
    } catch (err: unknown) {"""
new_try_block = """    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
        setSuccess(`✅ Member details updated successfully!`);
        setForm(defaultForm);
        setEditingUser(null);
        setIsChangingPassword(false);
        setConfirmPassword('');
        load();
        setTimeout(() => { setShowModal(false); setSuccess(''); }, 1500);
      } else {
        await api.sendCreationOtp({ email: payload.email });
        setPendingPayload(payload);
        setShowOtpModal(true);
      }
    } catch (err: unknown) {"""
content = content.replace(old_try_block, new_try_block)

# 4. Remove handleResendInvite
content = re.sub(r'  const handleResendInvite = async.*?};\n', '', content, flags=re.DOTALL)

# 5. Remove resend button from JSX
resend_jsx_pattern = r'                  \{\!user\.is_verified && \(\s*<button\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleResendInvite\(user\); \}\}\s*className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"\s*title="Resend Invite"\s*>\s*<Mail className="w-4 h-4" />\s*</button>\s*\)\}'
content = re.sub(resend_jsx_pattern, '', content, flags=re.DOTALL)

# 6. Add OTP Modal JSX right after showModal opens
otp_modal_jsx = """
      {showOtpModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-2xl border border-primary/30 p-6 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.5)] animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-2">Verify Creation</h3>
            <p className="text-sm text-text-muted mb-6">
              A 6-digit verification code has been sent to <strong className="text-primary">{pendingPayload?.email}</strong>. Enter it below to finalize account creation.
            </p>
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error animate-in fade-in text-center">
                  {error}
                </div>
              )}
              <input 
                type="text" 
                maxLength={6} 
                required 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value.replace(/\\D/g, ''))} 
                placeholder="000000" 
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-surface border border-border rounded-xl focus:border-primary outline-none"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowOtpModal(false)} className="flex-1 py-2.5 rounded-xl border border-border hover:bg-surface text-sm font-semibold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || otpCode.length !== 6} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? 'Verifying...' : 'Verify & Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
content = content.replace('      {showModal && (', otp_modal_jsx + '      {showModal && (')

with open('frontend/src/pages/TeamPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
