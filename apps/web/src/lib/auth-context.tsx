'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User } from '@code-atlas/shared';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    subscribeNewsletter?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      // Token invalid or expired — try refresh
      try {
        const { accessToken } = await api.refresh();
        localStorage.setItem('access_token', accessToken);
        const data = await api.getMe();
        setUser(data);
      } catch {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setAccessToken = async (token: string) => {
    localStorage.setItem('access_token', token);
    await fetchUser();
  };

  const login = async (email: string, password: string) => {
    const { accessToken } = await api.login({ email, password });
    localStorage.setItem('access_token', accessToken);
    await fetchUser();
    router.push('/dashboard');
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    subscribeNewsletter?: boolean;
  }) => {
    const { accessToken } = await api.register(data);
    localStorage.setItem('access_token', accessToken);
    await fetchUser();
    router.push('/dashboard');
  };

  const logout = async () => {
    // Clear the httpOnly refresh_token cookie via Next.js route handler
    // (works even when the NestJS backend is unreachable)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    // Best-effort: also tell backend to invalidate the token server-side
    await api.logout().catch(() => null);
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
