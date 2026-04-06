'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Radio, Layers, Database, Server, HardDrive } from 'lucide-react';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  x: number;   // SVG / CSS position — 0-100 (maps to %)
  y: number;
  delay: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  order: number;
  prerequisiteLabel: string;
}

interface ConnPair {
  from: string;
  to: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const NODES: NodeDef[] = [
  {
    id: 'api',   x: 18, y: 38, color: '#10b981', bg: '#052e16', delay: '0s',
    label: 'REST & gRPC',  Icon: Zap,
    href: '/dashboard/api',
    description: 'Compare latency, payload, and streaming. Fire real requests.',
    order: 1, prerequisiteLabel: 'Start here — fundamentals of data transfer',
  },
  {
    id: 'rt',    x: 40, y: 18, color: '#f59e0b', bg: '#1c1003', delay: '0.5s',
    label: 'Real-time',    Icon: Radio,
    href: '/dashboard/realtime',
    description: 'Short-poll to WebSocket. See the efficiency break in real time.',
    order: 2, prerequisiteLabel: 'After REST & gRPC',
  },
  {
    id: 'kafka', x: 68, y: 22, color: '#a855f7', bg: '#1e1035', delay: '1s',
    label: 'Kafka',        Icon: Layers,
    href: '/dashboard/kafka',
    description: 'Topics, partitions, offsets, consumer groups — animated.',
    order: 3, prerequisiteLabel: 'After Real-time',
  },
  {
    id: 'db',    x: 82, y: 55, color: '#3b82f6', bg: '#0a1628', delay: '0.8s',
    label: 'Databases',    Icon: Database,
    href: '/dashboard/database',
    description: 'B-tree vs full scan. ACID transactions simulated live.',
    order: 4, prerequisiteLabel: 'After Kafka',
  },
  {
    id: 'scale', x: 55, y: 68, color: '#ef4444', bg: '#1a0505', delay: '1.4s',
    label: 'Scalability',  Icon: Server,
    href: '/dashboard/scalability',
    description: 'Load balancers, read replicas, sharding — interactive.',
    order: 5, prerequisiteLabel: 'After Databases',
  },
  {
    id: 'cache', x: 28, y: 72, color: '#8b5cf6', bg: '#150d2e', delay: '0.3s',
    label: 'Caching',      Icon: HardDrive,
    href: '/dashboard/caching',
    description: 'TTL, LRU eviction, write-through. Run hit/miss scenarios.',
    order: 6, prerequisiteLabel: 'After Scalability',
  },
];

const CONNECTIONS: ConnPair[] = [
  { from: 'api',   to: 'rt'    },
  { from: 'rt',    to: 'kafka' },
  { from: 'kafka', to: 'db'    },
  { from: 'db',    to: 'scale' },
  { from: 'scale', to: 'cache' },
  { from: 'cache', to: 'api'   },
  { from: 'api',   to: 'db'    },
  { from: 'rt',    to: 'scale' },
];

// ─── SVG helpers ──────────────────────────────────────────────────────────────
// viewBox is "0 0 100 100" — node x/y coords map 1:1 to viewBox units.
// Control point = midpoint of the two endpoints, shifted -5 units in Y.

function buildPath(fromNode: NodeDef, toNode: NodeDef): string {
  const cx = (fromNode.x + toNode.x) / 2;
  const cy = (fromNode.y + toNode.y) / 2 - 5;
  return `M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`;
}

function getControlPoint(a: NodeDef, b: NodeDef): [number, number] {
  return [(a.x + b.x) / 2, (a.y + b.y) / 2 - 5];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const cancelRef = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { beginnerMode } = useBeginnerModeContext();

  // ── Packet animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    cancelRef.current = false;
    let pairIndex = 0;
    let scheduleTimer: ReturnType<typeof setTimeout>;

    function firePacket() {
      if (cancelRef.current) return;

      const conn = CONNECTIONS[pairIndex % CONNECTIONS.length];
      pairIndex++;

      const fromNode = NODES.find((n) => n.id === conn.from);
      const toNode   = NODES.find((n) => n.id === conn.to);

      if (!fromNode || !toNode) {
        scheduleTimer = setTimeout(firePacket, 900 + Math.random() * 600);
        return;
      }

      const x0 = fromNode.x;
      const y0 = fromNode.y;
      const x2 = toNode.x;
      const y2 = toNode.y;
      const [cx, cy] = getControlPoint(fromNode, toNode);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '1');
      circle.setAttribute('fill', fromNode.color);
      circle.setAttribute('cx', String(x0));
      circle.setAttribute('cy', String(y0));
      svg.appendChild(circle);

      const startTime = performance.now();
      const duration  = 1400;

      function step(now: number) {
        if (cancelRef.current) { circle.remove(); return; }

        const t  = Math.min((now - startTime) / duration, 1);
        const mt = 1 - t;
        const x  = mt * mt * x0 + 2 * mt * t * cx + t * t * x2;
        const y  = mt * mt * y0 + 2 * mt * t * cy + t * t * y2;
        const opacity =
          t < 0.1 ? t * 9 :
          t > 0.9 ? (1 - t) * 9 :
          0.9;

        circle.setAttribute('cx',      String(x));
        circle.setAttribute('cy',      String(y));
        circle.setAttribute('opacity', String(opacity));

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          circle.remove();
        }
      }

      requestAnimationFrame(step);
      scheduleTimer = setTimeout(firePacket, 900 + Math.random() * 600);
    }

    scheduleTimer = setTimeout(firePacket, 400);

    return () => {
      cancelRef.current = true;
      clearTimeout(scheduleTimer);
    };
  }, []);

  const hoveredNode = hoveredId ? NODES.find((n) => n.id === hoveredId) ?? null : null;

  return (
    <>
      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.8);  opacity: 0;   }
        }
        @keyframes scanLine {
          0%   { top: 0%;   }
          100% { top: 100%; }
        }
        @keyframes caretBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Root shell ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position:       'relative',
          width:          '100%',
          height:         '100vh',
          overflow:       'hidden',
          background:     '#080c10',
          display:        'flex',
          flexDirection:  'column',
        }}
      >
        {/* Grid background — covers full viewport */}
        <div
          aria-hidden
          style={{
            position:        'absolute',
            inset:           0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize:  '48px 48px',
            pointerEvents:   'none',
          }}
        />

        {/* Scan line */}
        <div
          aria-hidden
          style={{
            position:    'absolute',
            left:        0,
            right:       0,
            height:      1,
            background:  'rgba(16,185,129,0.15)',
            animation:   'scanLine 6s linear infinite',
            pointerEvents: 'none',
            zIndex:      2,
          }}
        />

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <header
          style={{
            position:       'absolute',
            top:            0,
            left:           0,
            right:          0,
            height:         56,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 28px',
            borderBottom:   '0.5px solid rgba(255,255,255,0.06)',
            background:     'rgba(8,12,16,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex:         10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30, height: 30,
                borderRadius: 8,
                background: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#080c10',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(16,185,129,0.35)',
              }}
            >
              CA
            </div>
            <span
              style={{
                fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              <span style={{ color: '#f9fafb' }}>Code </span>
              <span style={{ color: '#10b981', textShadow: '0 0 20px rgba(16,185,129,0.4)' }}>Atlas</span>
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-dm-mono), monospace',
              color: '#4b5563',
            }}
          >
            6 systems · live simulations · v2.0
          </span>
        </header>

        {/* ── Header spacer (pushes flex children below the absolute header) ── */}
        <div style={{ height: 56, flexShrink: 0 }} />

        {/* ── Hero text zone — sits above the node map, never overlaps ──────── */}
        <div
          style={{
            flexShrink:    0,
            textAlign:     'center',
            padding:       '32px 24px 28px',
            position:      'relative',
            zIndex:        5,
            animation:     'heroFadeUp 0.7s ease both',
            borderBottom:  '0.5px solid rgba(255,255,255,0.04)',
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontSize:      10,
              fontFamily:    'var(--font-dm-mono), monospace',
              color:         '#10b981',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom:  16,
            }}
          >
            // interactive systems map
          </p>

          {/* Headline */}
          <h1
            style={{
              fontFamily:    'var(--font-inter), Inter, sans-serif',
              lineHeight:    1.08,
              letterSpacing: '-0.03em',
              margin:        0,
            }}
          >
            <span style={{
              display:       'block',
              fontSize:      15,
              fontWeight:    300,
              color:         '#6b7280',
              letterSpacing: '0.01em',
              marginBottom:  4,
            }}>
              Backend engineering,
            </span>
            <span style={{
              display:              'block',
              fontSize:             48,
              fontWeight:           800,
              background:           'linear-gradient(135deg, #f9fafb 30%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
            }}>
              finally visual.
            </span>
          </h1>

          {/* Subtext with blinking cursor */}
          <p
            style={{
              marginTop:      20,
              fontSize:       13,
              fontFamily:     'var(--font-dm-mono), monospace',
              color:          '#52526a',
              lineHeight:     1.6,
              display:        'flex',
              alignItems:     'baseline',
              justifyContent: 'center',
              gap:            6,
            }}
          >
            <span style={{ color: '#10b981', flexShrink: 0 }}>&gt;_</span>
            <span>
              six live simulators.{' '}
              <span style={{ color: '#9ca3af' }}>click any node.</span>
            </span>
            <span
              style={{
                display:       'inline-block',
                width:         1,
                height:        12,
                background:    '#10b981',
                marginLeft:    2,
                animation:     'caretBlink 1.1s step-end infinite',
                verticalAlign: 'middle',
                flexShrink:    0,
              }}
            />
          </p>

          {/* Beginner mode strip — visible only when beginner mode is on */}
          {beginnerMode && (
            <div
              style={{
                marginTop:    14,
                display:      'inline-flex',
                alignItems:   'center',
                gap:          8,
                background:   'rgba(16,185,129,0.08)',
                border:       '1px solid rgba(16,185,129,0.2)',
                borderRadius: 8,
                padding:      '5px 14px',
                fontSize:     11,
                fontFamily:   'var(--font-dm-mono), monospace',
              }}
            >
              <span style={{ color: '#10b981' }}>Beginner Mode</span>
              <span style={{ color: '#374151' }}>·</span>
              <span style={{ color: '#6b7280' }}>numbers show suggested order · hover a node to start</span>
            </div>
          )}
        </div>

        {/* ── Map area — flex-1, nodes never overlap the hero text ─────────── */}
        <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>

          {/* SVG — connection paths + animated packet circles */}
          <svg
            ref={svgRef}
            aria-hidden
            style={{
              position:      'absolute',
              inset:         0,
              width:         '100%',
              height:        '100%',
              pointerEvents: 'none',
              overflow:      'visible',
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {CONNECTIONS.map((conn) => {
              const from = NODES.find((n) => n.id === conn.from);
              const to   = NODES.find((n) => n.id === conn.to);
              if (!from || !to) return null;
              return (
                <path
                  key={`${conn.from}-${conn.to}`}
                  d={buildPath(from, to)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={0.3}
                  strokeDasharray="1 1.5"
                  fill="none"
                />
              );
            })}
            {/* Animated packet circles are appended here imperatively by useEffect */}
          </svg>

          {/* Nodes */}
          {NODES.map((node) => {
            const isHovered = hoveredId === node.id;
            return (
              <div
                key={node.id}
                style={{
                  position:  'absolute',
                  left:      `${node.x}%`,
                  top:       `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex:    10,
                  cursor:    'pointer',
                }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => router.push(node.href)}
              >
                {/* Pulse ring */}
                <span
                  aria-hidden
                  style={{
                    position:   'absolute',
                    inset:      0,
                    width:      44,
                    height:     44,
                    borderRadius: '50%',
                    border:     `1.5px solid ${node.color}`,
                    animation:  'pulseRing 2.4s ease-out infinite',
                    animationDelay: node.delay,
                    display:    'block',
                    pointerEvents: 'none',
                  }}
                />

                {/* Dot */}
                <span
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:          44,
                    height:         44,
                    borderRadius:   '50%',
                    background:     node.bg,
                    border:         `1.5px solid ${node.color}`,
                    boxShadow:      isHovered
                      ? `0 0 20px ${node.color}60`
                      : `0 0 10px ${node.color}30`,
                    transform:      isHovered ? 'scale(1.12)' : 'scale(1)',
                    transition:     'transform 0.18s ease, box-shadow 0.18s ease',
                    position:       'relative',
                    zIndex:         1,
                  }}
                >
                  <node.Icon size={18} color={node.color} />
                </span>

                {/* Beginner mode: order badge */}
                {beginnerMode && (
                  <span
                    aria-hidden
                    style={{
                      position:       'absolute',
                      top:            -6,
                      right:          -6,
                      width:          18,
                      height:         18,
                      borderRadius:   '50%',
                      background:     node.color,
                      color:          '#080c10',
                      fontSize:       10,
                      fontWeight:     700,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      zIndex:         2,
                      fontFamily:     'var(--font-inter), Inter, sans-serif',
                      boxShadow:      `0 0 6px ${node.color}80`,
                    }}
                  >
                    {node.order}
                  </span>
                )}

                {/* Label */}
                <span
                  aria-hidden
                  style={{
                    position:     'absolute',
                    top:          50,
                    left:         '50%',
                    transform:    'translateX(-50%)',
                    fontSize:     11,
                    fontWeight:   500,
                    color:        node.color,
                    whiteSpace:   'nowrap',
                    fontFamily:   'var(--font-body), DM Sans, sans-serif',
                    pointerEvents: 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  {node.label}
                </span>
              </div>
            );
          })}

          {/* Tooltip */}
          {hoveredNode && (
            <div
              role="tooltip"
              style={{
                position:      'absolute',
                left:          hoveredNode.x > 60
                  ? `calc(${hoveredNode.x}% - 204px)`
                  : `calc(${hoveredNode.x}% + 32px)`,
                top:           `calc(${hoveredNode.y}% - 24px)`,
                width:         180,
                background:    '#111720',
                border:        `0.5px solid ${hoveredNode.color}33`,
                borderRadius:  10,
                padding:       '12px 14px',
                zIndex:        20,
                pointerEvents: 'none',
              }}
            >
              <p
                style={{
                  fontSize:   12,
                  fontWeight: 600,
                  color:      hoveredNode.color,
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                {hoveredNode.label}
              </p>
              <p
                style={{
                  marginTop:  4,
                  fontSize:   11,
                  color:      '#6b7280',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body), DM Sans, sans-serif',
                }}
              >
                {hoveredNode.description}
              </p>
              {beginnerMode && (
                <p
                  style={{
                    marginTop:  8,
                    fontSize:   10,
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color:      '#10b981',
                  }}
                >
                  #{hoveredNode.order} · {hoveredNode.prerequisiteLabel}
                </p>
              )}
              <p
                style={{
                  marginTop:  beginnerMode ? 4 : 10,
                  fontSize:   10,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color:      '#10b981',
                }}
              >
                → enter simulation
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────────── */}
        <footer
          style={{
            position:  'absolute',
            bottom:    0,
            left:      0,
            right:     0,
            padding:   '14px 28px',
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            zIndex:    10,
          }}
        >
          <span
            style={{
              fontSize:   11,
              fontFamily: 'var(--font-dm-mono), monospace',
              color:      '#374151',
            }}
          >
            $ hover a node → preview | click → enter simulation
          </span>
        </footer>
      </div>
    </>
  );
}
