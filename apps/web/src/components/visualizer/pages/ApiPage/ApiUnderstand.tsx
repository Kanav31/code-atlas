'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { ComparisonGrid } from '@/components/visualizer/shared/ComparisonGrid';
import { Term } from '@/components/visualizer/shared/Term';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-api)';
const REST_COLOR = '#60a5fa';

const API_CONCEPTS = [
  {
    term: 'API (Application Programming Interface)',
    plain: 'A contract that lets two programs talk to each other. You call a function; it returns data.',
    analogy: 'A restaurant menu — it tells you what you can order and what you\'ll get back.',
  },
  {
    term: 'Protocol',
    plain: 'A set of rules both sides agree to follow when communicating. REST and gRPC are two different protocols.',
    analogy: 'Like agreeing to speak English vs. Morse code before a conversation starts.',
  },
  {
    term: 'Serialization',
    plain: 'Converting data (a user object) into a format that can travel over a network (bytes).',
    analogy: 'Packing your belongings into a moving box so they can be transported and unpacked at the destination.',
  },
];

// ─── Guided tour data ─────────────────────────────────────────────────────────

interface TourStep {
  num: number;
  title: string;
  rest: { headline: string; detail: string; impact: string };
  grpc: { headline: string; detail: string; impact: string };
  beginnerInsight: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    num: 1,
    title: 'Client initiates the request',
    rest: {
      headline: 'Prepares an HTTP/1.1 text request',
      detail: 'GET /users/42 HTTP/1.1\nHost: api.example.com\nAccept: application/json\nAuthorization: Bearer ...',
      impact: 'Headers repeat with every request — no compression. A single request can carry 300–800B of header overhead alone.',
    },
    grpc: {
      headline: 'Client stub serializes to Protobuf binary',
      detail: 'GetUserRequest { id: 42 }\n→ 0x08 0x2a  (2 bytes total)\nField names are integers, not strings.',
      impact: 'Zero repeated strings. Field 1 = id, Field 2 = name — the schema handles the mapping offline.',
    },
    beginnerInsight: 'REST writes out the full request in readable text every time — like reciting your name and address before each question. gRPC uses a shared codebook so it only sends a tiny numeric ID. Same information, ~10× less data.',
  },
  {
    num: 2,
    title: 'Connection setup',
    rest: {
      headline: 'TCP 3-way handshake: SYN → SYN-ACK → ACK',
      detail: 'Client sends SYN.\nServer replies SYN-ACK.\nClient confirms ACK.\nNow — and only now — data can flow.',
      impact: 'Costs 1 full round-trip before any data moves. At 100ms round-trip (cross-region), that\'s 100ms wasted per request.',
    },
    grpc: {
      headline: 'HTTP/2 stream — already open (or 1 TLS setup)',
      detail: 'First call: 1 TLS + ALPN handshake (amortized across all future calls).\nEvery call after: stream_id++, no setup.',
      impact: '0 RTT overhead on repeat calls. The connection lives for the lifetime of the service.',
    },
    beginnerInsight: 'Every REST request pays a 3-message "hello handshake" toll before a single byte of real data moves. gRPC pays this toll once when the service starts — the thousandth request is just as fast as the first.',
  },
  {
    num: 3,
    title: 'Data travels on the wire',
    rest: {
      headline: 'JSON text — ~240B for a simple user object',
      detail: '{"id":42,"name":"Alice Chen",\n "role":"engineer","dept":"Platform"}',
      impact: '~60% of the payload is key names ("id", "name", "role", "dept"). They repeat on every response, even if the schema never changes.',
    },
    grpc: {
      headline: 'Protobuf binary — ~38B for the same object',
      detail: '0a 02 2a 00 12 0a 41 6c 69 63\n65 20 43 68 65 6e 1a 08 65 6e\n...  (38 bytes)',
      impact: '6× smaller payload. Less bandwidth, faster parse, better mobile battery life. At 1M req/day: ~200MB saved vs JSON.',
    },
    beginnerInsight: '240 bytes vs 38 bytes for the exact same data. The difference: REST includes the field name ("name", "role") on every response. gRPC\'s schema already knows — it just sends the values. At 1 million requests/day, that\'s 200MB of saved bandwidth, daily.',
  },
  {
    num: 4,
    title: 'After the response',
    rest: {
      headline: 'TCP connection is closed (HTTP/1.1 default)',
      detail: 'Connection: close\nFIN → FIN-ACK → ACK\nNext request: SYN → SYN-ACK → ACK all over again.',
      impact: 'At 1000 req/s, REST creates and destroys 1000 TCP connections per second. Each has its own 3-packet handshake.',
    },
    grpc: {
      headline: 'HTTP/2 stream stays open — multiplexed forever',
      detail: 'stream_id: 1 closed, but the TCP channel lives.\nNext call opens stream_id: 3, immediately.\n100 concurrent calls share 1 connection.',
      impact: 'At 1000 req/s, gRPC uses 1 persistent connection. Overhead per request: ~0ms setup, ~0 extra bytes.',
    },
    beginnerInsight: 'REST tears down the connection after every response, then rebuilds it for the next request. At 1,000 requests/second, REST is creating and destroying 1,000 connections per second. gRPC holds one connection open and multiplexes everything through it.',
  },
];

// ─── Guided tour component ────────────────────────────────────────────────────

function GuidedTour() {
  const { beginnerMode } = useBeginnerModeContext();
  const [idx, setIdx] = useState(0);
  // Beginners start paused so they can read at their own pace
  const [playing, setPlaying] = useState(!beginnerMode);
  const [progress, setProgress] = useState(0);

  const intervalMs = beginnerMode ? 6000 : 2800;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TOUR_STEPS.length), intervalMs);
    return () => clearInterval(t);
  }, [playing, intervalMs]);

  // Countdown progress bar (beginner mode only, when playing)
  useEffect(() => {
    if (!beginnerMode || !playing) { setProgress(0); return; }
    setProgress(0);
    const startTime = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / intervalMs) * 100, 100));
    }, 80);
    return () => clearInterval(tick);
  }, [beginnerMode, playing, idx, intervalMs]);

  const step = TOUR_STEPS[idx];
  if (!step) return null;

  function goTo(i: number) {
    setIdx(i);
    setPlaying(false);
  }

  function goNext() {
    setIdx((i) => (i + 1) % TOUR_STEPS.length);
    setPlaying(false);
  }

  function goPrev() {
    setIdx((i) => (i - 1 + TOUR_STEPS.length) % TOUR_STEPS.length);
    setPlaying(false);
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLOR }}>
            {beginnerMode ? 'Step by step · read at your pace' : 'Live walkthrough · auto-play'}
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] mt-0.5">
            Step {step.num}/{TOUR_STEPS.length} — {step.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Dot nav */}
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 8 : 6,
                height: i === idx ? 8 : 6,
                background: i === idx ? COLOR : 'var(--dim)',
                opacity: i === idx ? 1 : 0.35,
                boxShadow: i === idx ? `0 0 0 3px color-mix(in srgb, var(--c-api) 25%, transparent)` : undefined,
              }}
            />
          ))}

          {beginnerMode ? (
            // Manual nav for beginners — auto-play is secondary
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={goPrev}
                className="text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
                style={{ color: 'var(--text2)', borderColor: 'var(--line)' }}
              >
                ← prev
              </button>
              <button
                type="button"
                onClick={goNext}
                className="text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, var(--c-api) 40%, transparent)` }}
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
                borderColor: playing ? 'color-mix(in srgb, var(--c-api) 30%, transparent)' : 'var(--line)',
              }}
            >
              {playing ? '⏸ pause' : '▶ play'}
            </button>
          )}
        </div>
      </div>

      {/* Countdown bar — beginner mode, when auto-playing */}
      {beginnerMode && playing && (
        <div className="h-px w-full bg-[var(--line)] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: COLOR, transition: 'width 80ms linear' }}
          />
        </div>
      )}

      {/* Two-column comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* REST column */}
        <div
          className="rounded-xl border p-4 space-y-2.5"
          style={{
            background: `color-mix(in srgb, ${REST_COLOR} 5%, var(--bg1))`,
            borderColor: `color-mix(in srgb, ${REST_COLOR} 20%, var(--line))`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: REST_COLOR }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: REST_COLOR }}>
              REST / HTTP/1.1
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--text)] leading-snug">{step.rest.headline}</p>
          <pre className="text-[10px] font-mono text-[var(--muted)] leading-relaxed whitespace-pre-wrap break-all">
            {step.rest.detail}
          </pre>
          <div
            className="pt-2 border-t text-[10px] text-[var(--text2)] leading-snug"
            style={{ borderColor: `color-mix(in srgb, ${REST_COLOR} 15%, var(--line))` }}
          >
            <span style={{ color: REST_COLOR }}>⚡ </span>{step.rest.impact}
          </div>
        </div>

        {/* gRPC column */}
        <div
          className="rounded-xl border p-4 space-y-2.5"
          style={{
            background: 'color-mix(in srgb, var(--c-api) 5%, var(--bg1))',
            borderColor: 'color-mix(in srgb, var(--c-api) 20%, var(--line))',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: COLOR }}>
              gRPC / HTTP/2
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--text)] leading-snug">{step.grpc.headline}</p>
          <pre className="text-[10px] font-mono text-[var(--muted)] leading-relaxed whitespace-pre-wrap break-all">
            {step.grpc.detail}
          </pre>
          <div
            className="pt-2 border-t text-[10px] text-[var(--text2)] leading-snug"
            style={{ borderColor: 'color-mix(in srgb, var(--c-api) 15%, var(--line))' }}
          >
            <span style={{ color: COLOR }}>✓ </span>{step.grpc.impact}
          </div>
        </div>
      </div>

      {/* Beginner insight — the "so what?" in plain English */}
      {beginnerMode && (
        <div className="mt-3">
          <Callout type="tip" title="What this means:">
            {step.beginnerInsight}
          </Callout>
        </div>
      )}

      {/* Beginner: auto-play toggle as secondary action */}
      {beginnerMode && (
        <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
          {playing
            ? <><span>auto-advancing · </span><button type="button" onClick={() => setPlaying(false)} className="underline" style={{ color: 'var(--text2)' }}>pause</button></>
            : <><span>paused · </span><button type="button" onClick={() => setPlaying(true)} className="underline" style={{ color: COLOR }}>auto-play</button></>
          }
        </p>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ApiUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_api_understand');

  const showGate = beginnerMode && mounted && isFirstVisit;

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {/* Vocabulary primer — shown once in beginner mode */}
      {showGate ? (
        <ConceptGate
          concepts={API_CONCEPTS}
          accentColor={COLOR}
          onReady={markSeen}
        />
      ) : (
        <>
          {beginnerMode && mounted && (
            <KeyTermsAccordion concepts={API_CONCEPTS} accentColor={COLOR} />
          )}
          <GuidedTour />
        </>
      )}

      {/* ELI5 analogy */}
      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">Think of it like ordering food.</strong>{' '}
        REST is calling the waiter every time — you recite your order in full sentences (<Term term="Protobuf">JSON</Term>-style text),
        he writes it down, walks to the kitchen, comes back. Each visit starts fresh with a new{' '}
        <Term term="TCP handshake">TCP handshake</Term>.
        gRPC is a direct kitchen hotline with a shorthand form (<Term term="Protobuf">Protobuf</Term>) — you press a button,
        the order is already half-filled in, and the line stays open via{' '}
        <Term term="HTTP/2">HTTP/2</Term> — never hangs up.
      </ELI5Card>

      {/* Protocol diagrams */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">How REST works</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Client                            Server
    │                                  │
    │  TCP Handshake (3 round trips)   │
    │ ────────────────────────────►    │
    │ ◄────────────────────────────    │
    │                                  │
    │  GET /users/42  HTTP/1.1         │
    │  Accept: application/json        │
    │ ────────────────────────────►    │
    │                                  │
    │  200 OK  {"id":42,"name":"..."} │
    │  Content-Type: application/json  │
    │ ◄────────────────────────────    │
    │                                  │
    │  [connection closed]             │`}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">How gRPC works</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Client                            Server
    │                                  │
    │  HTTP/2 + TLS  (once)            │
    │ ────────────────────────────►    │
    │  (connection persists forever)   │
    │                                  │
    │  GetUser{id: 42}  [protobuf]     │
    │  ~2 bytes binary  stream_id: 1   │
    │ ────────────────────────────►    │
    │                                  │
    │  User{id:42,name:"..."}          │
    │  ~22 bytes binary                │
    │ ◄────────────────────────────    │
    │                                  │
    │  [stream open, next call: 0ms]   │`}
        </div>
      </div>

      <ComparisonGrid
        columns={[
          {
            title: 'REST',
            accent: '#60a5fa',
            badge: { label: 'text/json', color: '#60a5fa' },
            items: [
              'Human-readable JSON payload',
              'New TCP connection per request',
              'HTTP/1.1 — one request at a time',
              'Self-documenting with Swagger/OpenAPI',
              'Works natively in any browser',
            ],
          },
          {
            title: 'gRPC',
            accent: COLOR,
            badge: { label: 'protobuf', color: COLOR },
            items: [
              <><Term term="Protobuf">Protobuf</Term> binary — ~6× smaller than JSON</>,
              <><Term term="HTTP/2">HTTP/2</Term> — persistent, <Term term="multiplexed">multiplexed</Term> connection</>,
              'Streaming: server, client, or bidirectional',
              'Strict contract enforced by .proto schema',
              'Requires code-gen toolchain, no direct browser',
            ],
          },
        ]}
      />

      <Callout type="tip" title="When to choose gRPC:">
        Internal microservice communication, high-throughput pipelines, real-time streaming, or
        polyglot systems where you need a strict contract. Use REST for public APIs where browser
        clients need to hit you directly — or where human-readable debugging matters.
      </Callout>
    </div>
  );
}
