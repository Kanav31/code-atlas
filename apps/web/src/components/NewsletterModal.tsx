'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// sessionStorage so dismissal resets each login session.
// Subscribed users are filtered out by the API check, so they never see it.
const DISMISSED_KEY = 'newsletter_dismissed_session';

type State = 'hidden' | 'visible' | 'loading' | 'success' | 'error';

export function NewsletterModal() {
  const { user } = useAuth();
  const [state, setState] = useState<State>('hidden');

  useEffect(() => {
    if (!user) return;

    // Already dismissed in this browser
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Check subscription status, then show after a short delay
    let cancelled = false;
    api.getNewsletterStatus()
      .then(({ subscribed }) => {
        if (cancelled || subscribed) return;
        // Delay so user has a moment to orient before the modal appears
        setTimeout(() => {
          if (!cancelled) setState('visible');
        }, 1500);
      })
      .catch(() => {
        // Silently ignore — never block the dashboard over a newsletter check
      });

    return () => { cancelled = true; };
  }, [user]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setState('hidden');
  }

  async function subscribe() {
    setState('loading');
    try {
      await api.subscribeMe();
      setState('success');
      sessionStorage.setItem(DISMISSED_KEY, '1');
      // Auto-close after the success message has been read
      setTimeout(() => setState('hidden'), 2800);
    } catch {
      // Show error state so user can retry or dismiss
      setState('error');
    }
  }

  if (state === 'hidden') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {state === 'success' ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'color-mix(in srgb, var(--c-cache) 15%, transparent)' }}
            >
              ✓
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">You&apos;re subscribed!</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              We&apos;ll email you when we ship new topics. Check your inbox for a welcome note.
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
              style={{ background: 'color-mix(in srgb, var(--c-cache) 15%, transparent)' }}
            >
              📬
            </div>

            {/* Heading */}
            <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
              Stay in the loop
            </h2>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-5">
              Get notified when we add new topics — Caching deep dives, system design walkthroughs,
              and interview prep updates. No marketing, just content.
            </p>

            {/* Pre-filled email display */}
            {user?.email && (
              <div
                className="rounded-lg border px-3 py-2.5 text-[11px] font-mono text-[var(--muted)] mb-4 truncate"
                style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
              >
                {user.email}
              </div>
            )}

            {/* Error feedback */}
            {state === 'error' && (
              <p className="text-xs text-red-400 mb-2">
                Something went wrong. Please try again.
              </p>
            )}

            {/* CTA */}
            <button
              type="button"
              disabled={state === 'loading'}
              onClick={subscribe}
              className="w-full rounded-lg py-2.5 text-xs font-semibold transition-opacity"
              style={{
                background: 'var(--c-cache)',
                color: '#000',
                opacity: state === 'loading' ? 0.6 : 1,
              }}
            >
              {state === 'loading' ? 'Subscribing…' : state === 'error' ? 'Try again' : 'Subscribe — it\'s free'}
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismiss}
              className="w-full mt-2.5 text-[11px] text-[var(--muted)] hover:text-[var(--text2)] transition-colors py-1"
            >
              No thanks, maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
