import { cookies } from 'next/headers';
import { Github } from 'lucide-react';
import Link from 'next/link';
import { LandingLogo } from '@/components/landing/LandingLogo';
import { LandingNavActions } from '@/components/landing/LandingNavActions';
import { LandingHeroNodes } from '@/components/landing/LandingHeroNodes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleDef {
  label: string;
  description: string;
  href: string;
  color: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

// Precomputed quadratic bezier paths for the hero map SVG.
// ViewBox: 700 × 280. Node coords = left% × 7, top% × 2.8 (i.e. VW=700, VH=280).
// Control point = midpoint of the two endpoints shifted up 30 units.
const HERO_PATHS = [
  'M 126 106.4 Q 203 48.4 280 50.4',     // api → rt
  'M 280 50.4 Q 378 26 476 61.6',         // rt → kafka
  'M 476 61.6 Q 525 77.8 574 154',        // kafka → db
  'M 574 154 Q 479.5 142.2 385 190.4',    // db → scale
  'M 385 190.4 Q 290.5 166 196 201.6',    // scale → cache
  'M 196 201.6 Q 161 124 126 106.4',      // cache → api
  'M 126 106.4 Q 350 100.2 574 154',      // api → db
  'M 280 50.4 Q 332.5 90.4 385 190.4',    // rt → scale
];

const MODULES: ModuleDef[] = [
  { label: 'REST & gRPC',         color: '#10b981', href: '/dashboard/api',         description: 'Compare REST and gRPC — latency, payload, streaming, and when to choose each.' },
  { label: 'Real-time',           color: '#f59e0b', href: '/dashboard/realtime',    description: 'Short polling, long polling, WebSockets — see the efficiency difference live.' },
  { label: 'Kafka & Queues',      color: '#a855f7', href: '/dashboard/kafka',       description: 'Topics, partitions, offsets, and consumer groups visualized in real time.' },
  { label: 'Database & Indexing', color: '#3b82f6', href: '/dashboard/database',   description: 'Watch a B-tree index vs full table scan. Simulate ACID transactions.' },
  { label: 'Scalability',         color: '#ef4444', href: '/dashboard/scalability', description: 'Load balancers, read replicas, and sharding — interactive architecture.' },
  { label: 'Caching',             color: '#8b5cf6', href: '/dashboard/caching',    description: 'TTL, LRU eviction, and write-through — run cache hit/miss scenarios.' },
];

const STEPS = [
  { num: '01', title: 'Pick a system',   body: 'Choose from APIs, WebSockets, Kafka, Databases, Scaling, or Caching.' },
  { num: '02', title: 'Watch it live',   body: 'Animated packets, real latency numbers, live node diagrams — not cartoons.' },
  { num: '03', title: 'Actually get it', body: 'Run your own scenarios. Break things. See exactly what changes.' },
];

// ─── CSS keyframes (defined once at top level) ────────────────────────────────

const KEYFRAMES = `
  @keyframes lp-pulse-ring {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes lp-scan {
    0%   { top: -1px; }
    100% { top: 100%; }
  }
  .lp-module-card {
    border: 0.5px solid rgba(255,255,255,0.06);
    transition: border-color 150ms ease;
  }
  .lp-module-card:hover {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const cookieStore = cookies();
  const isLoggedIn = cookieStore.has('logged_in');

  return (
    <div style={{ background: '#080c10', color: '#fff', minHeight: '100vh', position: 'relative' }}>
      <style>{KEYFRAMES}</style>

      {/* ── CSS grid background ─────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Scan line ───────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          height: 1,
          background: 'rgba(16,185,129,0.15)',
          animation: 'lp-scan 6s linear infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(8,12,16,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 32px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo — link to / when logged in, plain div when logged out */}
          <LandingLogo isLoggedIn={isLoggedIn} />

          {/* Nav actions — user chip when logged in, auth buttons when logged out */}
          <LandingNavActions isLoggedIn={isLoggedIn} />
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 0',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Eyebrow pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 14px',
            borderRadius: 99,
            border: '0.5px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.08)',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-dm-mono), monospace',
              color: '#10b981',
            }}
          >
            // open for early access
          </span>
        </div>

        {/* H1 */}
        <h1
          style={{
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            marginBottom: 20,
          }}
          className="text-[36px] md:text-[56px]"
        >
          <span style={{ display: 'block', color: '#fff' }}>The fastest way to</span>
          <span style={{ display: 'block', color: '#fff' }}>understand backend</span>
          <span style={{ display: 'block', color: '#10b981' }}>engineering.</span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            color: '#6b7280',
            maxWidth: 500,
            margin: '0 auto',
            lineHeight: 1.6,
            fontFamily: 'var(--font-body), DM Sans, sans-serif',
          }}
        >
          Six interactive simulations. Real data moving through real systems.
          No slides. No walls of text. Just you and the code.
        </p>

        {/* CTA row — guest only */}
        {!isLoggedIn && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: 40,
              }}
            >
              <Link
                href="/signup"
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  background: '#10b981',
                  color: '#080c10',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                Start exploring →
              </Link>
              <Link
                href="/login"
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                Sign in
              </Link>
            </div>

            {/* Mono hint */}
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                fontFamily: 'var(--font-dm-mono), monospace',
                color: '#374151',
              }}
            >
              no credit card · free forever · 6 modules unlocked
            </p>
          </>
        )}

        {/* ── Hero decorative map ─────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 768,
            margin: '64px auto 0',
            height: 280,
          }}
        >
          {/* SVG connection paths */}
          <svg
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
            viewBox="0 0 700 280"
            preserveAspectRatio="none"
          >
            {HERO_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                strokeDasharray="4 6"
                fill="none"
              />
            ))}
          </svg>

          {/* Nodes — decorative when logged out, clickable links when logged in */}
          <LandingHeroNodes isLoggedIn={isLoggedIn} />

          {/* Bottom vignette — blends map into next section */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: 'linear-gradient(to bottom, transparent, #080c10)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '96px 24px',
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-dm-mono), monospace',
            color: '#10b981',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          HOW IT WORKS
        </p>
        <h2
          style={{
            marginTop: 12,
            fontSize: 32,
            fontWeight: 700,
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            color: '#fff',
            letterSpacing: '-0.02em',
          }}
        >
          Learn by doing, not reading.
        </h2>

        {/* Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
            marginTop: 64,
            maxWidth: 900,
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.num}
              style={{
                background: '#0d1117',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '24px',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color: '#10b981',
                }}
              >
                {step.num}
              </span>
              <h3
                style={{
                  marginTop: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: '#6b7280',
                  lineHeight: 1.6,
                  fontFamily: 'var(--font-body), DM Sans, sans-serif',
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MODULES GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '96px 24px',
          background: '#060a0d',
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-dm-mono), monospace',
            color: '#10b981',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          THE MODULES
        </p>
        <h2
          style={{
            marginTop: 12,
            fontSize: 32,
            fontWeight: 700,
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            color: '#fff',
            letterSpacing: '-0.02em',
          }}
        >
          Six systems. All interactive.
        </h2>

        {/* Module grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 48,
            maxWidth: 900,
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
          }}
        >
          {MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="lp-module-card"
              style={
                { '--accent': mod.color, background: '#0d1117', borderRadius: 14, padding: 20, display: 'block', textDecoration: 'none' } as React.CSSProperties
              }
            >
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: mod.color, flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#fff',
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                  }}
                >
                  {mod.label}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body), DM Sans, sans-serif',
                }}
              >
                {mod.description}
              </p>

              {/* Explore link */}
              <p
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color: mod.color,
                }}
              >
                Explore →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA BANNER — guest only
      ══════════════════════════════════════════════════════════════════════ */}
      {!isLoggedIn && <section
        style={{
          padding: '96px 24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            Ready to actually understand this stuff?
          </h2>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: '#6b7280',
              fontFamily: 'var(--font-body), DM Sans, sans-serif',
              lineHeight: 1.6,
            }}
          >
            Join engineers who stopped reading docs and started simulating.
          </p>
          <div style={{ marginTop: 32 }}>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                borderRadius: 12,
                background: '#10b981',
                color: '#080c10',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
              }}
            >
              Get started for free →
            </Link>
          </div>
          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              fontFamily: 'var(--font-dm-mono), monospace',
              color: '#374151',
            }}
          >
            Takes 30 seconds. No setup.
          </p>
        </div>
      </section>}

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding: '48px 32px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          position: 'relative',
          zIndex: 2,
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          {/* Left: logo + tagline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
                  fontSize: 15, fontWeight: 700,
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                Code <span style={{ color: '#10b981' }}>Atlas</span>
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#4b5563',
                fontFamily: 'var(--font-body), DM Sans, sans-serif',
              }}
            >
              Backend engineering, finally visual.
            </p>
          </div>

          {/* Right: links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: '#6b7280',
                textDecoration: 'none',
                fontFamily: 'var(--font-body), DM Sans, sans-serif',
              }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: 13,
                color: '#6b7280',
                textDecoration: 'none',
                fontFamily: 'var(--font-body), DM Sans, sans-serif',
              }}
            >
              Get started
            </Link>
            <a
              href="https://github.com/Kanav31/code-atlas"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              style={{ color: '#6b7280', display: 'flex' }}
            >
              <Github size={16} />
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '0.5px solid rgba(255,255,255,0.04)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: '#374151',
              fontFamily: 'var(--font-dm-mono), monospace',
            }}
          >
            © {new Date().getFullYear()} Code Atlas. Built for engineers who learn by doing.
          </p>
        </div>
      </footer>
    </div>
  );
}
