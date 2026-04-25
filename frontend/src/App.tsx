import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Dashboard from './Dashboard';

import { API_URL } from './api';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Failed to connect to the backend server. Please make sure the Python server is running.");
      }
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
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8b5cf6] opacity-20 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass p-10 rounded-[3rem] shadow-2xl relative z-10"
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
          <h1 className="text-3xl font-bold text-text mb-2">Colour Parrot</h1>
          <p className="text-text-muted">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error/90">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted ml-1">Email address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder-text-muted/50 transition-all outline-none"
                placeholder="you@your.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder-text-muted/50 transition-all outline-none"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-[#8b5cf6] hover:opacity-90 text-white rounded-xl font-medium transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden mt-8"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </span>
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-text-muted/60">
          Colour Parrot Workflow System 🦜
        </div>
      </motion.div>
    </div>
  );
}

export default App;
