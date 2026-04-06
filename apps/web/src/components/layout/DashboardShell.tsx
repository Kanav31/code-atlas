'use client';

import { useState } from 'react';
import { Sidebar, MobileMenuButton } from '@/components/layout/Sidebar';
import { NewsletterModal } from '@/components/NewsletterModal';
import { useSidebar } from '@/hooks/useSidebar';
import { useBeginnerMode } from '@/hooks/useBeginnerMode';
import { BeginnerModeContext } from '@/lib/beginner-mode-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { User } from '@code-atlas/shared';

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse bg-[var(--bg3)] rounded ${className}`} />;
}

function DashboardLoadingSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-[260px] h-screen flex-shrink-0 bg-[var(--bg1)] border-r border-[var(--line)]">
        <div className="h-[61px] px-4 flex items-center gap-3 border-b border-[var(--line)]">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <Shimmer className="h-4 w-24" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-1.5">
          <Shimmer className="h-2.5 w-14 mb-3 ml-2 rounded" />
          {[1, 0.85, 0.7, 0.55, 0.4, 0.3].map((op, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse bg-[var(--bg3)]" style={{ opacity: op }} />
          ))}
        </div>
        <div className="border-t border-[var(--line)] px-3 py-3">
          <Shimmer className="h-10 rounded-lg" />
        </div>
        <div className="border-t border-[var(--line)] px-3 py-3 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-2.5 w-20" />
              <Shimmer className="h-2 w-32" />
            </div>
          </div>
          <Shimmer className="h-9 rounded-lg" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="md:hidden flex items-center h-[61px] px-4 border-b border-[var(--line)] bg-[var(--bg1)] gap-3">
          <Shimmer className="w-9 h-9 rounded-lg" />
          <Shimmer className="h-4 w-28" />
        </div>
        <div className="flex-1 p-8 space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Shimmer className="h-7 w-48" />
            <Shimmer className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-[var(--bg1)] border border-[var(--line)] animate-pulse" />
            ))}
          </div>
          <div className="space-y-3 pt-2">
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-5/6" />
            <Shimmer className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationPendingScreen({ user, onVerified }: { user: User; onVerified: () => void }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await api.resendVerification();
      setResent(true);
    } catch {
      // silently ignore
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    setRefreshing(true);
    try {
      await onVerified();
    } finally {
      setRefreshing(false);
    }
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
          {/* Animated icon */}
          <div className="flex items-center justify-center">
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--c-api) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--c-api) 20%, transparent)',
              }}
            >
              <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                <rect x="3" y="7" width="26" height="18" rx="3" stroke="var(--c-api)" strokeWidth="1.8" />
                <path d="M3 11l13 9 13-9" stroke="var(--c-api)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {/* Pulsing ring */}
              <span
                className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                style={{ backgroundColor: 'var(--c-api)' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold font-heading text-[var(--text)] tracking-tight">
              Verify your email
            </h1>
            <p className="text-sm text-[var(--text2)]">
              We sent a verification link to
            </p>
            <p className="text-sm font-semibold text-[var(--text)] bg-[var(--bg3)] px-3 py-1.5 rounded-lg inline-block font-mono">
              {user.email}
            </p>
            <p className="text-xs text-[var(--muted)] pt-1 leading-relaxed">
              Click the link in your email to unlock your account. Once verified, click the button below.
            </p>
          </div>

          {/* Skeleton-style waiting animation */}
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--c-api)] animate-pulse flex-shrink-0" />
              Waiting for verification…
            </div>
            <div className="w-full h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--c-api) 0%, transparent 100%)',
                  animation: 'shimmer 2s ease-in-out infinite',
                  width: '60%',
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCheckVerified}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium bg-[var(--c-api)] text-[var(--bg)] hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {refreshing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Checking…
                </>
              ) : (
                "I've verified — continue →"
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full py-2 text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
            >
              {resent ? '✓ Sent! Check your inbox' : resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshUser } = useAuth();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { beginnerMode, toggleBeginnerMode, mounted: beginnerMounted } = useBeginnerMode();

  if (loading) return <DashboardLoadingSkeleton />;

  // Gate local users who haven't verified their email yet
  if (user && !user.emailVerified && user.provider === 'LOCAL') {
    return <VerificationPendingScreen user={user} onVerified={refreshUser} />;
  }

  return (
    <BeginnerModeContext.Provider value={{ beginnerMode, toggleBeginnerMode }}>
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        beginnerMounted={beginnerMounted}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar — only visible on <768px */}
        <div className="md:hidden flex items-center h-[61px] px-4 border-b border-[var(--line)] bg-[var(--bg1)] flex-shrink-0 gap-3">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--c-api)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--bg)] font-bold text-[10px] font-heading">CA</span>
            </div>
            <span className="text-sm font-bold font-heading text-[var(--text)] tracking-tight">
              Code <span className="text-[var(--c-api)]">Atlas</span>
            </span>
          </div>
        </div>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          data-collapsed={String(collapsed)}
        >
          {children}
        </main>
      </div>

      <NewsletterModal />
    </div>
    </BeginnerModeContext.Provider>
  );
}
