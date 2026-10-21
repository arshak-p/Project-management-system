import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokens, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokens.access));

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await api.me());
  }, []);

  useEffect(() => {
    if (!tokens.access) return;
    api.me().then(setUser).catch(() => tokens.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email.trim().toLowerCase(), password);
    tokens.set(data.access, data.refresh);
    setUser(await api.me());
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
