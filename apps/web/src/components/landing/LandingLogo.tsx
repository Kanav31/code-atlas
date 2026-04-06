'use client';

import Link from 'next/link';

interface Props { isLoggedIn: boolean }

export function LandingLogo({ isLoggedIn }: Props) {
  const content = (
    <>
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#080c10',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          flexShrink: 0,
        }}
      >
        CA
      </div>
      <span
        style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
        }}
      >
        Code <span style={{ color: '#10b981' }}>Atlas</span>
      </span>
    </>
  );

  if (isLoggedIn) {
    return (
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {content}
    </div>
  );
}
