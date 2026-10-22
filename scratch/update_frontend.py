import os

base_dir = r'd:\c p web\web site code CP\python\frontend\src'

# 1. Update api.ts
api_path = os.path.join(base_dir, 'api.ts')
with open(api_path, 'r', encoding='utf-8') as f:
    api_content = f.read()

api_content = api_content.replace(
    "role: 'admin' | 'agency_manager' | 'team_head' | 'hr' | 'specialist';",
    "role: 'admin' | 'agency_manager' | 'team_head' | 'hr' | 'specialist';\n  is_verified: boolean;"
)

api_content = api_content.replace(
    "createUser: (data: object) =>\n    apiClient.post('/auth/create-user/', data),",
    "createUser: (data: object) =>\n    apiClient.post('/auth/create-user/', data),\n  activateAccount: (data: object) =>\n    apiClient.post('/auth/activate/', data),\n  resendActivation: (id: number) =>\n    apiClient.post('/auth/resend-activation/', { user_id: id }),"
)

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_content)

# 2. Update App.tsx
app_path = os.path.join(base_dir, 'App.tsx')
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

if "import ActivationScreen from './pages/ActivationScreen';" not in app_content:
    app_content = app_content.replace(
        "import Dashboard from './Dashboard';",
        "import Dashboard from './Dashboard';\nimport ActivationScreen from './pages/ActivationScreen';"
    )

    # Insert ActivationScreen route before the return (
    route_logic = """
  // Catch /activate route
  if (window.location.pathname === '/activate') {
    return <ActivationScreen onActivated={() => {
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, '/');
    }} />;
  }

  if (isAuthenticated) {"""
    app_content = app_content.replace("if (isAuthenticated) {", route_logic)

    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(app_content)

# 3. Create ActivationScreen.tsx
activation_path = os.path.join(base_dir, 'pages', 'ActivationScreen.tsx')
activation_content = """import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import axios from 'axios';

interface ActivationScreenProps {
  onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationScreenProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email');
    const t = params.get('token');
    if (e && t) {
      setEmail(e);
      setToken(t);
    } else {
      setError('Invalid activation link. Missing email or token.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) {
      setError('Invalid link. Please check your email and click the link again.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await api.activateAccount({ email, token, new_password: password });
      setSuccess('Account activated successfully! Logging you in...');
      
      // Save tokens
      localStorage.setItem('access_token', res.data.access);
      if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);
      
      setTimeout(() => {
        onActivated();
      }, 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const detail = err.response.data.detail || err.response.data.error;
        setError(Array.isArray(detail) ? detail.join(' ') : (typeof detail === 'string' ? detail : 'Activation failed.'));
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[111.11vh] w-[111.11vw] flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8b5cf6] opacity-10 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md glass p-10 rounded-[3rem] shadow-2xl relative z-10 border border-border/50"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-[#8b5cf6] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-text mb-2 tracking-tighter">Activate Account</h1>
          <p className="text-text-muted text-sm font-medium">Set your permanent password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-20">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-4">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                disabled
                className="w-full px-6 py-4 bg-surface/50 border border-border/50 rounded-2xl text-sm outline-none text-text-muted cursor-not-allowed"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-4">New Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-4 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all placeholder:text-text-muted/50 text-text"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-4">Confirm Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-6 py-4 bg-surface/50 border border-border/50 rounded-2xl text-sm focus:border-primary outline-none transition-all placeholder:text-text-muted/50 text-text"
                placeholder="••••••••"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-error">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-primary">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={isLoading || !email || !token || !!success}
            className="w-full py-4 bg-gradient-to-r from-primary to-[#8b5cf6] text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-glow disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Activate & Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
"""
with open(activation_path, 'w', encoding='utf-8') as f:
    f.write(activation_content)

# 4. Update TeamPage.tsx
team_path = os.path.join(base_dir, 'pages', 'TeamPage.tsx')
with open(team_path, 'r', encoding='utf-8') as f:
    team_content = f.read()

import_send = "import { Mail, "
if "Mail" not in team_content:
    team_content = team_content.replace("import { ", import_send)

resend_fn = """
  const handleResendInvite = async (user: User) => {
    try {
      await api.resendActivation(user.id);
      setSuccess(`✅ Activation email resent to ${user.email}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      console.error(err);
      setError(`Failed to resend invite to ${user.email}`);
      setTimeout(() => setError(''), 3000);
    }
  };
"""

if "handleResendInvite" not in team_content:
    team_content = team_content.replace(
        "const openEdit = (user: User) => {",
        resend_fn + "\n  const openEdit = (user: User) => {"
    )

    # Find where the user row is rendered to add the button
    # It's inside a table row. There's a section with buttons.
    # Look for: <button onClick={() => openEdit(user)}
    button_html = """
                      {!user.is_verified && (
                        <button 
                          onClick={() => handleResendInvite(user)}
                          title="Resend Invite"
                          className="w-8 h-8 rounded-lg bg-surface/50 border border-border flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-premium"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}"""
    
    # insert before openEdit button
    team_content = team_content.replace(
        "<button \n                          onClick={() => openEdit(user)}",
        button_html + "\n                      <button \n                          onClick={() => openEdit(user)}"
    )
    # the code uses exact formatting, so just use regex or a robust replace
    import re
    team_content = re.sub(
        r'(<button[^>]*onClick=\{\(\) => openEdit\(user\)\}[^>]*>)',
        button_html + r'\n                      \1',
        team_content
    )

with open(team_path, 'w', encoding='utf-8') as f:
    f.write(team_content)

print("Frontend updated.")
