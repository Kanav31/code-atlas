'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState, useRef, useEffect } from 'react';

interface Props { isLoggedIn: boolean }

export function LandingNavActions({ isLoggedIn }: Props) {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link
          href="/login"
          style={{
            padding: '7px 16px', borderRadius: 8,
            border: '0.5px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.8)', fontSize: 13,
            fontWeight: 500, textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          style={{
            padding: '7px 16px', borderRadius: 8,
            background: '#10b981', color: '#080c10',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Get started
        </Link>
      </div>
    );
  }

  // Initials fallback when no avatar image
  const initials = !loading && user
    ? (user.name
        ? user.name.split(' ').map((w: string) => w.charAt(0)).join('').slice(0, 2).toUpperCase()
        : (user.email?.charAt(0)?.toUpperCase() ?? '?'))
    : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Dashboard button */}
      <Link
        href="/dashboard/api"
        style={{
          padding: '7px 16px', borderRadius: 8,
          background: '#10b981', color: '#080c10',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        Dashboard →
      </Link>

      {/* Avatar + dropdown */}
      <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#111720',
          border: `1.5px solid ${open ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.12)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
          transition: 'border-color 150ms ease',
          padding: 0,
        }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              color: '#10b981',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              userSelect: 'none',
            }}
          >
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            minWidth: 192,
            background: '#0d1117',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 6,
            zIndex: 100,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* User info header */}
          {user && (
            <div
              style={{
                padding: '8px 10px 10px',
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                marginBottom: 4,
              }}
            >
              {user.name && (
                <p style={{
                  fontSize: 12, fontWeight: 600, color: '#f9fafb',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  marginBottom: 2,
                }}>
                  {user.name}
                </p>
              )}
              <p style={{
                fontSize: 11, color: '#6b7280',
                fontFamily: 'var(--font-body), DM Sans, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </p>
            </div>
          )}

          {/* Sign out */}
          <button
            role="menuitem"
            onClick={() => { logout(); setOpen(false); }}
            className="landing-nav-signout-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px', borderRadius: 7,
              fontSize: 13, color: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={14} color="currentColor" />
            Sign out
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
