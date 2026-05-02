import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import Dashboard from './Dashboard';

import { API_URL } from './api';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email,
        password
      });
      
      const token = response.data.access;
      const refresh = response.data.refresh;
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      setIsAuthenticated(true);
      
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as any;
        if (data?.verification_required) {
          setNeedsVerification(true);
          // Auto-trigger OTP send
          handleResendOtp();
        } else if (err.response?.status === 401) {
          setError("Invalid email or password.");
        } else if (err.response?.status === 403) {
          setError(data?.detail || "Access blocked.");
        } else if (err.response) {
          setError(`Server error (${err.response.status}). Please try again.`);
        } else if (err.code === 'ERR_NETWORK') {
          setError("Cannot reach the server. It may be waking up — please wait 30 seconds and try again.");
        } else {
          setError("Connection error. Please check your internet and try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp/`, {
        email,
        otp
      });
      
      const token = response.data.access;
      const refresh = response.data.refresh;
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      setIsAuthenticated(true);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');
    try {
      await axios.post(`${API_URL}/auth/request-otp/`, { email });
      setSuccess("Security code sent to your email.");
    } catch (err: any) {
      setError("Failed to send code. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8b5cf6] opacity-10 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass p-10 rounded-[3rem] shadow-2xl relative z-10 border border-white/5"
      >
        <AnimatePresence mode="wait">
          {!needsVerification ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-8">
                <img 
                  src="/colour parrot-icon.png" 
                  alt="Colour Parrot Logo" 
                  className="h-28 w-auto mx-auto mb-5 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = document.getElementById('login-fallback-logo');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div id="login-fallback-logo" className="hidden w-16 h-16 bg-gradient-to-br from-primary to-[#8b5cf6] rounded-2xl items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <span className="text-2xl font-black text-white">CP</span>
                </div>
                <h1 className="text-3xl font-black text-text mb-2 tracking-tighter">Colour Parrot</h1>
                <p className="text-text-muted text-sm font-medium">Sign in to your account</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error/90 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">Email address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder-text-muted/50 transition-all outline-none text-sm font-bold"
                      placeholder="you@agency.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder-text-muted/50 transition-all outline-none text-sm font-bold"
                      placeholder="Enter security key"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-primary transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-glow flex items-center justify-center disabled:opacity-70 mt-8"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Enter Dashboard'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-text mb-2 tracking-tighter">Verify Identity</h1>
                <p className="text-text-muted text-sm font-medium px-4">
                  A secure 6-digit code has been dispatched to <span className="text-white font-bold">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error/90 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-primary/90 font-medium">{success}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">6-Digit Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-3xl tracking-[0.5em] font-black text-text placeholder-text-muted/20 outline-none transition-all"
                    placeholder="000000"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-glow flex items-center justify-center disabled:opacity-70 mt-4"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Confirm Clearance'}
                </button>

                <div className="flex flex-col gap-3 mt-8">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Request New Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeedsVerification(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 hover:text-text transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Login
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;
