import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

const TOKEN_KEY = 'lunara.token';

type RegisterInput = { role: 'client' | 'reader'; name: string; email: string; password: string };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (newToken: string | null, newUser: User | null) => {
    setAuthToken(newToken);
    if (newToken) await storage.set(TOKEN_KEY, newToken);
    else await storage.remove(TOKEN_KEY);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => applySession(null, null), [applySession]);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      try {
        const saved = await storage.get(TOKEN_KEY);
        if (saved) {
          setAuthToken(saved);
          const { user: me } = await api<{ user: User }>('/auth/me');
          setToken(saved);
          setUser(me);
        }
      } catch {
        // Hors ligne ou session expirée : on repart de l'écran d'accueil.
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
      await applySession(res.token, res.user);
      return res.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: input });
      await applySession(res.token, res.user);
      return res.user;
    },
    [applySession],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, setUser }),
    [user, token, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
