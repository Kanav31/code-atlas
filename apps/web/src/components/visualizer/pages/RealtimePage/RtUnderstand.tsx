'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { ComparisonGrid } from '@/components/visualizer/shared/ComparisonGrid';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-rt)';

// ─── Concept gate ─────────────────────────────────────────────────────────────

const RT_CONCEPTS = [
  {
    term: 'HTTP Request/Response',
    plain: 'A client asks a question, the server answers, and the conversation ends. Every request starts fresh.',
    analogy: 'Sending a letter — you write, they reply, but the mailbox closes after each exchange.',
  },
  {
    term: 'TCP connection',
    plain: 'The underlying "phone line" that HTTP and WebSockets run over. Takes 3 messages to establish.',
    analogy: 'Dialing someone before you can talk — the handshake happens once, then data flows.',
  },
  {
    term: 'Full-duplex',
    plain: 'Both sides can send messages at the same time, independently, on the same connection.',
    analogy: 'A phone call (vs a walkie-talkie where only one person talks at a time).',
  },
];

// ─── Guided tour data ─────────────────────────────────────────────────────────

interface TourStep {
  num: number;
  protocol: string;
  color: string;
  headline: string;
  diagram: string;
  insight: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    num: 1,
    protocol: 'Short Polling',
    color: '#f87171',
    headline: 'Client repeatedly asks "any new data?"',
    diagram: `Client          Server
  │                │
  │ GET /events ──►│
  │◄── 204 empty ──│  (wasted)
  │                │
  │ GET /events ──►│
  │◄── 204 empty ──│  (wasted)
  │                │
  │ GET /events ──►│
  │◄── 200 + data ─│  ✓ finally!`,
    insight:
      'At 1,000 users polling every 2s → 500 req/s hitting your server. If data arrives once a minute, 59 of 60 responses are empty — 98% wasted traffic.',
  },
  {
    num: 2,
    protocol: 'Long Polling',
    color: '#fbbf24',
    headline: 'Server holds the connection until data is ready',
    diagram: `Client          Server
  │                │
  │ GET /events ──►│
  │     (server    │
  │      holds...  │  ← connection open, waiting
  │      1200ms)   │
  │◄── 200 + data ─│  ✓ responds immediately
  │                │
  │ GET /events ──►│  (immediately opens new one)
  │     (holds...) │`,
    insight:
      'Much better — 0 wasted responses. But each message still requires a new TCP connection + headers. At 10K users, that is 10K simultaneous open HTTP connections on your server.',
  },
  {
    num: 3,
    protocol: 'WebSocket',
    color: 'var(--c-api)',
    headline: 'One HTTP upgrade — then a persistent full-duplex tunnel',
    diagram: `Client          Server
  │                │
  │ GET /ws        │
  │ Upgrade: ws ──►│
  │◄── 101 ────────│  ✓ tunnel open
  │                │
  │══ frame ══════►│  any time
  │◄══ frame ══════│  any time
  │◄══ frame ══════│  server pushes!
  │══ frame ══════►│  ~2 bytes overhead`,
    insight:
      'One TCP connection, unlimited messages, ~2 bytes of framing overhead per message. At 10K users → 10K persistent WS connections. Server pushes the moment data arrives — zero polling latency.',
  },
];

// ─── Guided tour component ────────────────────────────────────────────────────

function GuidedTour() {
  const { beginnerMode } = useBeginnerModeContext();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Pause auto-play for beginners on mount
  useEffect(() => {
    if (beginnerMode) setPlaying(false);
  }, [beginnerMode]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TOUR_STEPS.length), 3000);
    return () => clearInterval(t);
  }, [playing]);

  const step = TOUR_STEPS[idx]!;

  function goTo(i: number) { setIdx(i); setPlaying(false); }
  function goPrev() { goTo((idx - 1 + TOUR_STEPS.length) % TOUR_STEPS.length); }
  function goNext() { goTo((idx + 1) % TOUR_STEPS.length); }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLOR }}>
            Live walkthrough · {beginnerMode ? 'step-by-step' : 'auto-play'}
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] mt-0.5">
            Protocol {step.num}/3 — {step.protocol}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => goTo(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === idx ? s.color : 'var(--dim)',
                opacity: i === idx ? 1 : 0.3,
                boxShadow: i === idx ? `0 0 0 3px color-mix(in srgb, ${s.color} 25%, transparent)` : undefined,
              }}
            />
          ))}

          {beginnerMode ? (
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={goPrev}
                className="text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, ${COLOR} 30%, transparent)` }}
              >
                ← prev
              </button>
              <button
                type="button"
                onClick={goNext}
                className="text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, ${COLOR} 30%, transparent)` }}
              >
                next →
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="ml-2 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
              style={{
                color: playing ? COLOR : 'var(--muted)',
                borderColor: playing ? `color-mix(in srgb, ${COLOR} 30%, transparent)` : 'var(--line)',
              }}
            >
              {playing ? '⏸ pause' : '▶ play'}
            </button>
          )}
        </div>
      </div>

      {/* Single card */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          background: `color-mix(in srgb, ${step.color} 5%, var(--bg1))`,
          borderColor: `color-mix(in srgb, ${step.color} 20%, var(--line))`,
        }}
      >
        <span
          className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color: step.color,
            borderColor: `color-mix(in srgb, ${step.color} 35%, transparent)`,
            background: `color-mix(in srgb, ${step.color} 10%, transparent)`,
          }}
        >
          {step.protocol}
        </span>

        <p className="text-[11px] font-semibold text-[var(--text)] leading-snug">
          {step.headline}
        </p>

        <pre className="text-[10px] font-mono text-[var(--muted)] leading-relaxed whitespace-pre bg-[var(--bg)] rounded-lg p-3 overflow-x-auto">
          {step.diagram}
        </pre>

        {!beginnerMode && (
          <div
            className="pt-2.5 border-t text-[10px] text-[var(--text2)] leading-snug"
            style={{ borderColor: `color-mix(in srgb, ${step.color} 15%, var(--line))` }}
          >
            <span style={{ color: step.color }}>→ </span>
            {step.insight}
          </div>
        )}
      </div>

      {/* Beginner insight callout */}
      {beginnerMode && (
        <div className="mt-3">
          <Callout type="tip" title="What this means:">
            {step.insight}
          </Callout>
        </div>
      )}

      {/* Beginner auto-play link */}
      {beginnerMode && (
        <p className="text-center text-[10px] text-[var(--muted)] mt-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="underline underline-offset-2 hover:text-[var(--text2)] transition-colors"
          >
            {playing ? 'pause auto-play' : 'enable auto-play'}
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function RtUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_rt_understand');

  if (beginnerMode && mounted && isFirstVisit) {
    return (
      <div className="px-8 py-6 content-zone">
        <ConceptGate concepts={RT_CONCEPTS} accentColor={COLOR} onReady={markSeen} />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {beginnerMode && mounted && (
        <KeyTermsAccordion concepts={RT_CONCEPTS} accentColor={COLOR} />
      )}
      <GuidedTour />

      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">Think of waiting for a package delivery notification.</strong>{' '}
        Short polling = refreshing your email every 30 seconds.
        Long polling = leaving the email tab open (server holds until there&apos;s something to show).
        WebSocket = the courier has your phone number — they call you the moment it ships.
      </ELI5Card>

      {/* Short polling diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Short polling</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Client          Server
    │                │
    │ GET /events ──►│
    │◄── 204 empty ──│  (poll 1 — nothing)
    │                │
    │ GET /events ──►│
    │◄── 204 empty ──│  (poll 2 — nothing)
    │                │
    │ GET /events ──►│
    │◄── 200 + data ─│  (poll 3 — finally!)
    │                │
    └── repeats every N seconds ──────────┘`}
        </div>
      </div>

      {/* Long polling diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Long polling</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Client          Server
    │                │
    │ GET /events ──►│
    │     (server    │
    │      holds...  │  ← connection open, waiting
    │      1200ms)   │
    │◄── 200 + data ─│  data ready — respond immediately
    │                │
    │ GET /events ──►│  client immediately re-opens
    │     (holds...) │
    │◄── 200 + data ─│`}
        </div>
      </div>

      {/* WebSocket diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">WebSocket</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Client          Server
    │                │
    │ GET /ws        │
    │ Upgrade: ws ──►│
    │◄── 101 ────────│  TCP repurposed — HTTP is done
    │                │
    │══ frame ══════►│  client sends any time
    │◄══ frame ══════│  server sends any time
    │◄══ frame ══════│  server pushes — no polling
    │══ frame ══════►│  ~2 bytes framing overhead
    │                │
    └── single TCP connection until close ─────────┘`}
        </div>
      </div>

      <ComparisonGrid
        columns={[
          {
            title: 'Short Polling',
            accent: '#f87171',
            badge: { label: 'wasteful', color: '#f87171' },
            items: [
              'Requests fire every N seconds',
              'Most responses empty (204 No Content)',
              'Easy to implement — plain HTTP',
              'High server load at scale',
              'Latency = polling interval',
            ],
          },
          {
            title: 'Long Polling',
            accent: COLOR,
            badge: { label: 'better', color: COLOR },
            items: [
              'Server holds request until data ready',
              'Zero wasted responses',
              'New TCP connection per message',
              'Hard to scale — long-lived HTTP sockets',
              'Latency near-zero once data arrives',
            ],
          },
          {
            title: 'WebSocket',
            accent: 'var(--c-api)',
            badge: { label: 'best', color: 'var(--c-api)' },
            items: [
              'Single persistent full-duplex connection',
              'Server pushes anytime — no client polling',
              '~2 bytes overhead per message frame',
              'Requires sticky sessions at LB',
              'Sub-millisecond latency after connect',
            ],
          },
        ]}
      />

      <Callout type="tip" title="When to use each:">
        WebSockets for chat, collaborative editors, live games, cursor sharing.
        Long polling for low-frequency updates where WS infra is overkill.
        Short polling only for prototypes — never in production at scale.
        For server-only push (dashboards, feeds), consider Server-Sent Events — simpler and HTTP/2-native.
      </Callout>
    </div>
  );
}
