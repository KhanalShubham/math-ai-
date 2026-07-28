import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import type { PublicUser } from '../api/auth';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'student' | 'teacher' | 'parent') => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'mathsmentor-harness-auth';

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * localStorage token storage is a deliberate test-harness simplification —
 * NOT how a real product should store an access token (httpOnly cookie or
 * in-memory-only would be the production-grade choice). Fine here since this
 * harness only ever talks to a local dev backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : { user: null, token: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  async function login(email: string, password: string) {
    const { user, accessToken } = await authApi.login({ email, password });
    setState({ user, token: accessToken });
  }

  async function register(email: string, password: string, role: 'student' | 'teacher' | 'parent') {
    await authApi.register({ email, password, role });
    await login(email, password);
  }

  async function logout() {
    if (state.token) {
      await authApi.logout(state.token).catch(() => undefined);
    }
    setState({ user: null, token: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
