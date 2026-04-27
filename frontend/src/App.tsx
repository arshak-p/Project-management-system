import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Dashboard from './Dashboard';

import { API_URL } from './api';

type AuthMode = 'password' | 'otp';

function App() {
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Invalid email or password.");
        } else if (err.response?.status === 403) {
          setError("Access blocked (CSRF). Please try again.");
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

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/auth/otp/request/`, { email });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/otp/verify/`, { email, otp });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
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
        <div className="text-center mb-8">
          <img 
            src="/colour parrot-icon.png" 
            alt="Colour Parrot Logo" 
            className="h-24 w-auto mx-auto mb-5 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]"
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
          <p className="text-text-muted text-sm font-medium italic opacity-60">Creative Management Portal</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 overflow-hidden"
          >
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error/90 font-medium">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'password' ? (
            <motion.form 
              key="pass-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin} 
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">Email Access</label>
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
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-50">Password</label>
                  <button type="button" onClick={() => setMode('otp')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Verify via Email?</button>
                </div>
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
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-glow flex items-center justify-center disabled:opacity-70 group relative overflow-hidden mt-8"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={otpSent ? handleVerifyOTP : handleRequestOTP} 
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">Email Verification</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly={otpSent}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder-text-muted/50 transition-all outline-none text-sm font-bold ${otpSent ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="you@agency.com"
                    required
                  />
                </div>
              </div>

              {otpSent && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1 opacity-50">6-Digit Code</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary transition-colors">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary text-text placeholder-text-muted/50 transition-all outline-none text-center text-2xl font-black tracking-[0.5em]"
                      placeholder="000000"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-primary/60 font-bold px-1 pt-1 italic">Check your inbox for the security code.</p>
                </motion.div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-glow flex items-center justify-center disabled:opacity-70 group"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (otpSent ? 'Verify & Enter' : 'Send Security Code')}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setMode('password'); setOtpSent(false); setOtp(''); }} 
                  className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text flex items-center justify-center gap-2 py-2"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Password
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

export default App;
