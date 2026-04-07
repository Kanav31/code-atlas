import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Code Atlas — Interactive Systems Engineering';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#06060a',
          padding: '80px 100px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow blob */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: '#06060a',
            }}
          >
            CA
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#e8e8f2', letterSpacing: '-0.5px' }}>
            Code Atlas
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-2px',
            marginBottom: 28,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ color: '#ffffff' }}>The fastest way to</span>
          <span style={{ color: '#ffffff' }}>understand</span>
          <span style={{ color: '#10b981' }}>backend engineering.</span>
        </div>

        {/* Subtext */}
        <p style={{ fontSize: 24, color: '#6b7280', margin: 0, maxWidth: 700, lineHeight: 1.5 }}>
          Interactive visualizers · Animated simulations · 6 modules unlocked free
        </p>

        {/* Module pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 48 }}>
          {['REST & gRPC', 'WebSockets', 'Kafka', 'Databases', 'Scalability', 'Caching'].map((m) => (
            <div
              key={m}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 16,
                color: '#9ca3af',
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
