'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User } from '@code-atlas/shared';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    subscribeNewsletter?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
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
      document.cookie = 'logged_in=1; path=/; max-age=2592000; SameSite=lax';
      setUser(data);
    } catch {
      // Token invalid or expired — try refresh
      try {
        const { accessToken } = await api.refresh();
        localStorage.setItem('access_token', accessToken);
        document.cookie = 'logged_in=1; path=/; max-age=2592000; SameSite=lax';
        const data = await api.getMe();
        setUser(data);
      } catch {
        localStorage.removeItem('access_token');
        document.cookie = 'logged_in=; path=/; max-age=0; SameSite=lax';
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setLoggedInCookie = () => {
    document.cookie = 'logged_in=1; path=/; max-age=2592000; SameSite=lax';
  };

  const clearLoggedInCookie = () => {
    document.cookie = 'logged_in=; path=/; max-age=0; SameSite=lax';
  };

  const setAccessToken = async (token: string) => {
    localStorage.setItem('access_token', token);
    setLoggedInCookie();
    await fetchUser();
  };

  const login = async (email: string, password: string, redirectTo = '/dashboard') => {
    try {
      const { accessToken } = await api.login({ email, password });
      localStorage.setItem('access_token', accessToken);
      setLoggedInCookie();
      await fetchUser();
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof Error && err.message === 'email_not_verified') {
        throw new Error('Please verify your email address before logging in. Check your inbox.');
      }
      throw err;
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    subscribeNewsletter?: boolean;
  }) => {
    const { accessToken } = await api.register(data);
    localStorage.setItem('access_token', accessToken);
    setLoggedInCookie();
    await fetchUser();
    router.push('/dashboard');
  };

  const logout = async () => {
    clearLoggedInCookie();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    await api.logout().catch(() => null);
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setAccessToken, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
