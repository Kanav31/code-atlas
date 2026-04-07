'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VerifiedContent() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status');
  const success = status === 'success';
  const [autoLoggingIn, setAutoLoggingIn] = useState(success);

  useEffect(() => {
    if (!success) return;

    api.refresh()
      .then(({ accessToken }) => {
        localStorage.setItem('access_token', accessToken);
        document.cookie = 'logged_in=1; path=/; max-age=604800; SameSite=lax';
        router.replace('/dashboard');
      })
      .catch(() => {
        // Refresh token missing or expired — user needs to log in manually
        setAutoLoggingIn(false);
      });
  }, [success, router]);

  if (autoLoggingIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-[var(--c-api)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--c-api)] flex items-center justify-center">
              <span className="text-[var(--bg)] font-bold text-sm font-heading">CA</span>
            </div>
            <span className="text-xl font-bold font-heading text-[var(--text)] tracking-tight">
              Code <span className="text-[var(--c-api)]">Atlas</span>
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: success
                  ? 'color-mix(in srgb, var(--c-api) 12%, transparent)'
                  : 'color-mix(in srgb, #ef4444 12%, transparent)',
                border: success
                  ? '1px solid color-mix(in srgb, var(--c-api) 25%, transparent)'
                  : '1px solid color-mix(in srgb, #ef4444 25%, transparent)',
              }}
            >
              {success ? (
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="var(--c-api)" strokeWidth="1.8" />
                  <path d="M10 16l4 4 8-8" stroke="var(--c-api)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="#ef4444" strokeWidth="1.8" />
                  <path d="M12 12l8 8M20 12l-8 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold font-heading text-[var(--text)] tracking-tight">
              {success ? 'Email verified!' : 'Verification failed'}
            </h1>
            <p className="text-sm text-[var(--text2)] leading-relaxed">
              {success
                ? 'Your email has been verified. Taking you to Code Atlas...'
                : 'This verification link is invalid or has expired. Please request a new one by logging in.'}
            </p>
          </div>

          <Link
            href="/login"
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium bg-[var(--c-api)] text-[var(--bg)] hover:opacity-90 transition-opacity"
          >
            {success ? 'Sign in →' : 'Back to login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
