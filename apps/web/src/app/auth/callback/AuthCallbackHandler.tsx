'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthCallbackHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const { setAccessToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setAccessToken(token).then(() => {
      router.replace('/dashboard/api');
    });
  }, [params, setAccessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--c-api)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--text2)]">Signing you in…</p>
      </div>
    </div>
  );
}
