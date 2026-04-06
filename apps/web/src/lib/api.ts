import type { User } from '@code-atlas/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (data: {
    name: string;
    email: string;
    password: string;
    subscribeNewsletter?: boolean;
  }) => request<{ accessToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  refresh: () => request<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  resendVerification: () =>
    request<{ message: string }>('/auth/resend-verification', { method: 'POST' }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  // Users
  getMe: () => request<User>('/users/me'),

  updateMe: (data: { name?: string; avatar?: string }) =>
    request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: () => request<void>('/users/me', { method: 'DELETE' }),

  // Newsletter
  subscribeMe: () => request<{ message: string }>('/newsletter/subscribe-me', { method: 'POST' }),

  unsubscribeMe: () => request<{ message: string }>('/newsletter/unsubscribe-me', { method: 'POST' }),

  getNewsletterStatus: () => request<{ subscribed: boolean }>('/newsletter/status'),

  blastNewsletter: (adminSecret: string, title: string, description: string) =>
    request<{ message: string; sent: number }>('/newsletter/blast', {
      method: 'POST',
      headers: { 'x-admin-secret': adminSecret },
      body: JSON.stringify({ title, description }),
    }),
};
