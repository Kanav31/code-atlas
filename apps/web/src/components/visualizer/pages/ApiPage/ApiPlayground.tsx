'use client';

import { useState, useCallback, useRef } from 'react';
import { Terminal, type LogLine } from '@/components/visualizer/shared/Terminal';
import { InputBar } from '@/components/visualizer/shared/InputBar';
import { StepBar } from '@/components/visualizer/shared/StepBar';
import { ScoreToast } from '@/components/visualizer/shared/ScoreToast';
import { sleep, rand, ts } from '@/lib/utils';
import { SimDisclaimer } from '@/components/visualizer/shared/SimDisclaimer';
import { WhatHappenedPanel } from '@/components/visualizer/shared/WhatHappenedPanel';
import { PlaygroundHint } from '@/components/visualizer/shared/PlaygroundHint';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

type Mode = 'rest' | 'grpc';
type Scenario = 'simple-get' | 'simple-post' | 'large-payload' | 'streaming';

// ─── Clickable examples ────────────────────────────────────────────────────────

const EXAMPLES: Record<Mode, Array<{ icon: string; cmd: string; label: string; hint: string }>> = {
  rest: [
    { icon: '👤', cmd: 'GET /users/42',      label: 'Fetch a user',     hint: 'Simple unary request'  },
    { icon: '✍️', cmd: 'POST /orders',        label: 'Create a resource', hint: 'Writes with a body'    },
    { icon: '📦', cmd: 'GET /users?limit=100', label: 'Load 100 users',   hint: 'Large JSON payload'    },
    { icon: '📡', cmd: 'subscribe events',    label: 'Real-time updates', hint: 'Polling vs streaming'  },
  ],
  grpc: [
    { icon: '👤', cmd: 'GetUser{id:42}',     label: 'Fetch a user',      hint: 'Simple unary RPC'      },
    { icon: '✍️', cmd: 'CreateUser',          label: 'Create a resource', hint: 'Write via protobuf'    },
    { icon: '📦', cmd: 'ListUsers',           label: 'Load 100 users',    hint: 'Large binary payload'  },
    { icon: '📡', cmd: 'SubscribeEvents',     label: 'Server push',       hint: 'Server-streaming RPC'  },
  ],
};

// ─── Scenario detection ────────────────────────────────────────────────────────

function parseScenario(raw: string): Scenario {
  const s = raw.toLowerCase();
  if (/stream|subscribe|watch|event|listen|push|realtime/.test(s)) return 'streaming';
  if (/large|bulk|list|all|batch|export|many|upload|download/.test(s)) return 'large-payload';
  if (/post|create|submit|send|add|insert|update|put|patch|delete/.test(s)) return 'simple-post';
  return 'simple-get';
}

// ─── Per-scenario data ─────────────────────────────────────────────────────────

const SCENARIO_DATA = {
  'simple-get': {
    endpoint: 'GET /users/42',
    grpcMethod: 'GetUser { id: 42 }',
    restBytes: () => rand(240, 520),
    grpcBytes: () => rand(18, 55),
    restReply: '{"id":42,"name":"Alice Chen","role":"engineer","dept":"Platform"}',
    grpcReply: 'User { id: 42, name: "Alice Chen", role: ENGINEER, dept: PLATFORM }',
    restLatency: () => rand(110, 260),
    grpcLatency: () => rand(12, 45),
  },
  'simple-post': {
    endpoint: 'POST /users',
    grpcMethod: 'CreateUser { name: "Bob", role: "dev" }',
    restBytes: () => rand(380, 720),
    grpcBytes: () => rand(28, 80),
    restReply: '{"status":"created","id":7,"message":"User created successfully"}',
    grpcReply: 'CreateUserResponse { status: OK, user_id: 7 }',
    restLatency: () => rand(130, 300),
    grpcLatency: () => rand(15, 55),
  },
  'large-payload': {
    endpoint: 'GET /users?limit=100',
    grpcMethod: 'ListUsers { limit: 100 }',
    restBytes: () => rand(18000, 42000),
    grpcBytes: () => rand(2800, 6500),
    restReply: '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"},...] — 100 items as JSON array',
    grpcReply: 'ListUsersResponse { users: [User×100] } — binary packed',
    restLatency: () => rand(280, 520),
    grpcLatency: () => rand(45, 110),
  },
  streaming: {
    endpoint: 'GET /events (polling)',
    grpcMethod: 'SubscribeEvents { topic: "users" }',
    restBytes: () => rand(800, 2200),
    grpcBytes: () => rand(120, 380),
    restReply: '{"events":[...],"nextPollIn":1000}  // must poll again in 1s',
    grpcReply: 'EventStream → frame_1 → frame_2 → ... (server pushes continuously)',
    restLatency: () => rand(200, 480),
    grpcLatency: () => rand(20, 60),
  },
} satisfies Record<
  Scenario,
  {
    endpoint: string; grpcMethod: string;
    restBytes: () => number; grpcBytes: () => number;
    restReply: string; grpcReply: string;
    restLatency: () => number; grpcLatency: () => number;
  }
>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

let _logId = 0;
function logId() { return String(++_logId); }
function fmtBytes(b: number) { return b >= 1024 ? `${(b / 1024).toFixed(1)}KB` : `${b}B`; }

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

// ─── Main component ────────────────────────────────────────────────────────────

export function ApiPlayground() {
  const [mode, setMode] = useState<Mode>('rest');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({
    total: 5, current: -1,
    label: 'Pick an example below or type your own request',
  });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);

  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();

  const callRegistry = useRef<Map<string, number>>(new Map());
  const grpcStreamOpen = useRef(false);

  const accentColor = mode === 'rest' ? '#60a5fa' : 'var(--c-api)';

  // addLine stays instant; slowLine adds a line + waits so each line is readable
  const addLine = useCallback((tag: string, tagColor: string, message: string) => {
    setLines((prev) => [...prev, { id: logId(), tag, tagColor, message, timestamp: ts() }]);
  }, []);

  async function slowLine(tag: string, tagColor: string, message: string, ms = 380) {
    addLine(tag, tagColor, message);
    await sleep(ms);
  }

  function setStep(current: number, label: string) {
    setStepState({ total: 5, current, label });
  }

  function pulseGlow(id: string) {
    setGlows((s) => new Set([...s, id]));
    setTimeout(() => setGlows((s) => { const n = new Set(s); n.delete(id); return n; }), 1200);
  }

  function showScore(msg: string) {
    setScoreMsg(null);
    setTimeout(() => setScoreMsg(msg), 10);
  }

  async function flyPkt(
    fromXPct: number, toXPct: number, yPct: number,
    label: string, color: string, textColor: string, dur = 600,
  ) {
    const id = `p${Date.now()}${Math.random()}`;
    setPackets((prev) => [...prev, { id, label, color, textColor, fromXPct, toXPct, yPct, active: false, dur }]);
    await sleep(32);
    setPackets((prev) => prev.map((p) => p.id === id ? { ...p, active: true } : p));
    await sleep(dur + 80);
    setPackets((prev) => prev.filter((p) => p.id !== id));
  }

  // ─── REST execution (paced) ────────────────────────────────────────────────

  async function runREST(raw: string, scenario: Scenario, callCount: number) {
    const data = SCENARIO_DATA[scenario];
    const restBytes = data.restBytes();
    const grpcBytes = data.grpcBytes();
    const latency = data.restLatency();
    const endpoint = data.endpoint;
    const isRepeat = callCount > 1;

    await slowLine('SND', '#60a5fa', `${raw}  →  ${endpoint}`, 320);
    if (isRepeat) {
      await slowLine('RPT', '#f59e0b', `Call #${callCount} — REST has no memory of the last call. Full handshake required again.`, 480);
    }

    // ── Phase 1: TCP handshake ──────────────────────────────────────────────
    setStep(0, isRepeat
      ? `Phase 1: TCP handshake again (REST repeats this every single time — call #${callCount})`
      : 'Phase 1: TCP 3-way handshake — before a single byte of data can move');
    pulseGlow('client');
    await sleep(200);
    pulseGlow('tcp');
    await slowLine('TCP', '#a78bfa', 'SYN → SYN-ACK → ACK  (3 packets across the wire)', 520);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: TCP mandates this exchange to guarantee reliability before any data flows', 440);
    if (isRepeat) {
      await slowLine('IMP', '#f87171', `↳ IMPACT: Call #${callCount} still pays this. At 1,000 req/s → 3,000 handshake packets/s wasted on setup`, 480);
    } else {
      await slowLine('IMP', 'var(--muted)', '↳ IMPACT: At 100ms RTT (cross-region), ≥100ms is wasted before your payload even starts moving', 480);
    }
    await flyPkt(20, 44, 28, 'SYN',     '#60a5fa', '#000', 400);
    await flyPkt(44, 20, 28, 'SYN-ACK', '#0a1828', '#60a5fa', 400);
    await flyPkt(20, 44, 28, 'ACK',     '#60a5fa', '#000', 350);

    // ── Phase 2: JSON serialization ────────────────────────────────────────
    setStep(1, 'Phase 2: Serializing request payload → JSON text');
    pulseGlow('payload');
    await sleep(250);
    await slowLine('SER', '#60a5fa', `JSON encode → ~${fmtBytes(restBytes)}`, 520);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: JSON writes every field name as a string on every response — "id", "name", "role" repeat verbatim', 440);
    await slowLine('CMP', '#34d399', `↳ vs gRPC: same data = ~${fmtBytes(grpcBytes)} protobuf (${Math.round(restBytes / grpcBytes)}× smaller — field names are integers, not strings)`, 480);

    // ── Phase 3: HTTP request ──────────────────────────────────────────────
    setStep(2, 'Phase 3: Sending HTTP/1.1 request to server');
    await sleep(200);
    await slowLine('REQ', '#60a5fa', `${endpoint}  HTTP/1.1  Accept: application/json  Authorization: Bearer ...`, 520);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: HTTP/1.1 headers are plain text and repeat in full with every single request — no compression', 440);
    await flyPkt(20, 80, 50, endpoint.slice(0, 22), '#60a5fa', '#000', 700);
    pulseGlow('server');

    // ── Phase 4: Server processing ─────────────────────────────────────────
    setStep(3, `Phase 4: Server processing your request (~${latency}ms)...`);
    await sleep(Math.max(latency, 400));

    // ── Phase 5: Response + teardown ───────────────────────────────────────
    setStep(4, 'Phase 5: Response received — TCP connection is CLOSED');
    await slowLine('RSP', '#60a5fa',
      scenario === 'large-payload'
        ? `200 OK  Content-Length: ${fmtBytes(restBytes)}  (JSON array, ${Math.round(restBytes / grpcBytes)}× larger than protobuf)`
        : `200 OK  ${data.restReply}`,
      520);
    await flyPkt(80, 20, 55, `200 OK ${fmtBytes(restBytes)}`, '#0a1828', '#60a5fa', 700);
    pulseGlow('client');
    await slowLine('INF', 'var(--muted)', `latency: ${latency}ms  payload: ${fmtBytes(restBytes)}  TCP CLOSED ✗`, 420);
    await slowLine('IMP', '#f87171', '↳ IMPACT: Connection destroyed. Next call starts from zero — new SYN, new ACK, new full headers', 480);
    await slowLine('CMP', '#34d399', `↳ gRPC same call: ~${fmtBytes(grpcBytes)}, ~${data.grpcLatency()}ms, and the stream stays open`, 460);

    // ── Summary ────────────────────────────────────────────────────────────
    await slowLine('───', 'var(--line)', '─────────────── Summary ───────────────', 200);
    await slowLine('SUM', '#60a5fa', `REST  │ ${fmtBytes(restBytes)} payload · ${latency}ms · TCP closed after response`, 380);
    await slowLine('SUM', '#34d399', `gRPC  │ ~${fmtBytes(grpcBytes)} payload · ~${data.grpcLatency()}ms · connection persists`, 380);
    await slowLine('INS', '#fbbf24',
      scenario === 'large-payload'
        ? `↳ At 10K req/day: REST ~${((restBytes * 10000) / 1024 / 1024).toFixed(0)}MB; gRPC ~${((grpcBytes * 10000) / 1024 / 1024).toFixed(0)}MB — ${Math.round(restBytes / grpcBytes)}× bandwidth saved`
        : `↳ At 1,000 req/s: REST creates & destroys 1,000 TCP connections/s; gRPC uses 1 persistent connection`,
      400);

    showScore(`REST: ${fmtBytes(restBytes)} · ${latency}ms · TCP closed · vs gRPC ${fmtBytes(grpcBytes)} (${Math.round(restBytes / grpcBytes)}× bigger)`);
  }

  // ─── gRPC execution (paced) ────────────────────────────────────────────────

  async function runGRPC(raw: string, scenario: Scenario, callCount: number) {
    const data = SCENARIO_DATA[scenario];
    const grpcBytes = data.grpcBytes();
    const restBytes = data.restBytes();
    const latency = data.grpcLatency();
    const method = data.grpcMethod;
    const streamId = callCount * 2 - 1;

    await slowLine('SND', 'var(--c-api)', `${raw}  →  ${method}`, 320);

    // ── Phase 1: Connection setup or stream reuse ──────────────────────────
    if (!grpcStreamOpen.current) {
      setStep(0, 'Phase 1: TLS + HTTP/2 handshake — one-time cost, amortized forever');
      pulseGlow('client');
      pulseGlow('tcp');
      await sleep(200);
      await slowLine('H2', 'var(--c-api)', 'TLS handshake + HTTP/2 ALPN negotiation — channel established', 520);
      await slowLine('WHY', 'var(--muted)', '↳ WHY: First call pays TLS setup once. Every call after reuses this channel for free.', 440);
      await slowLine('IMP', '#34d399', '↳ IMPACT: 1,000 calls = 1 setup, not 1,000. This cost approaches zero per-call at scale.', 480);
      grpcStreamOpen.current = true;
    } else {
      setStep(0, `Phase 1: Reusing HTTP/2 stream (stream_id: ${streamId}) — 0ms setup overhead`);
      pulseGlow('client');
      pulseGlow('tcp');
      await sleep(200);
      await slowLine('H2', 'var(--c-api)', `HTTP/2 stream opened (stream_id: ${streamId}) — connection already alive`, 520);
      await slowLine('WHY', 'var(--muted)', '↳ WHY: HTTP/2 multiplexes many requests over one TCP connection using stream IDs', 440);
      await slowLine('IMP', '#34d399', `↳ IMPACT: Call #${callCount} skipped the TCP handshake entirely. REST would have done SYN→SYN-ACK→ACK here.`, 480);
    }

    // ── Phase 2: Protobuf encoding ─────────────────────────────────────────
    setStep(1, 'Phase 2: Serializing → Protobuf binary (field names become integers)');
    pulseGlow('payload');
    await sleep(250);
    await slowLine('SER', 'var(--c-api)', `Protobuf encode → ~${fmtBytes(grpcBytes)} binary`, 520);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: Field names compile to integers in .proto — "name" becomes field 2. Zero string overhead on the wire.', 440);
    await slowLine('CMP', '#60a5fa', `↳ vs REST: same data = ~${fmtBytes(restBytes)} JSON (${Math.round(restBytes / grpcBytes)}× larger — repeats key names as strings every time)`, 480);

    // ── Phase 3: Binary frame ──────────────────────────────────────────────
    setStep(2, 'Phase 3: Sending binary frame over the persistent HTTP/2 connection');
    await sleep(200);
    await slowLine('REQ', 'var(--c-api)', `${method}  [protobuf, ${fmtBytes(grpcBytes)}]  stream_id: ${streamId}`, 520);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: HTTP/2 frames are length-prefixed binary. No verbose text headers repeated after the first call.', 440);
    if (scenario === 'streaming') {
      await slowLine('STR', 'var(--c-api)', '↳ Server-streaming RPC: server will push frames continuously — client never needs to poll', 460);
    }
    await flyPkt(20, 80, 50, `[pb] ${method.slice(0, 18)}`, 'var(--c-api)', '#000', 500);
    pulseGlow('server');

    // ── Phase 4: Server processing ─────────────────────────────────────────
    setStep(3, `Phase 4: Server processing your request (~${latency}ms)...`);
    await sleep(Math.max(latency, 400));

    // ── Phase 5: Response ──────────────────────────────────────────────────
    if (scenario === 'streaming') {
      setStep(4, 'Phase 5: Server pushing stream frames — no polling needed');
      await flyPkt(80, 20, 55, `[pb] frame_1 ${fmtBytes(grpcBytes)}`, '#0a1428', 'var(--c-api)', 500);
      await sleep(350);
      await flyPkt(80, 20, 55, `[pb] frame_2 ${fmtBytes(grpcBytes)}`, '#0a1428', 'var(--c-api)', 500);
      await slowLine('RSP', 'var(--c-api)', data.grpcReply, 520);
      await slowLine('IMP', '#34d399', '↳ IMPACT: Server pushes as events happen. REST alternative: poll every 1s → 60 wasted req/min per user', 480);
    } else {
      setStep(4, 'Phase 5: Response received — HTTP/2 stream stays open for next call');
      await flyPkt(80, 20, 55, `[pb] OK ${fmtBytes(grpcBytes)}`, '#0a1428', 'var(--c-api)', 500);
      await slowLine('RSP', 'var(--c-api)', data.grpcReply, 520);
    }
    pulseGlow('client');
    await slowLine('INF', 'var(--muted)', `latency: ${latency}ms  payload: ${fmtBytes(grpcBytes)}  stream STAYS OPEN ✓`, 420);
    await slowLine('IMP', '#34d399', '↳ IMPACT: HTTP/2 channel persists. Next call: stream_id++, 0ms setup, 0 extra TCP packets.', 480);
    await slowLine('CMP', '#60a5fa', `↳ REST same call: ~${fmtBytes(restBytes)}, ~${data.restLatency()}ms, then TCP closes`, 460);

    // ── Summary ────────────────────────────────────────────────────────────
    await slowLine('───', 'var(--line)', '─────────────── Summary ───────────────', 200);
    await slowLine('SUM', '#34d399', `gRPC  │ ${fmtBytes(grpcBytes)} payload · ${latency}ms · stream persists`, 380);
    await slowLine('SUM', '#60a5fa', `REST  │ ~${fmtBytes(restBytes)} payload · ~${data.restLatency()}ms · TCP closed`, 380);
    await slowLine('INS', '#fbbf24',
      scenario === 'streaming'
        ? `↳ At 10K users: gRPC = 10K open streams; REST polling = ~600K req/min of pure overhead`
        : `↳ At 1,000 req/s: gRPC uses 1 TCP connection total; REST creates & destroys 1,000/s`,
      400);

    showScore(`gRPC: ${fmtBytes(grpcBytes)} · ${latency}ms · stream open · vs REST ${fmtBytes(restBytes)} (${Math.round(restBytes / grpcBytes)}× bigger)`);
  }

  // ─── Send handler ──────────────────────────────────────────────────────────

  async function handleSend(override?: string) {
    if (busy) return;
    const raw = override ?? (input.trim() || (mode === 'rest' ? 'GET /users/42' : 'GetUser{id:42}'));
    setInput('');
    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 5, current: -1, label: 'Pick an example below or type your own request' });
    setScoreMsg(null);
    setBusy(true);

    const scenario = parseScenario(raw);
    const callKey = `${mode}:${scenario}`;
    const callCount = (callRegistry.current.get(callKey) ?? 0) + 1;
    callRegistry.current.set(callKey, callCount);

    if (mode === 'rest') {
      await runREST(raw, scenario, callCount);
    } else {
      await runGRPC(raw, scenario, callCount);
    }

    setBusy(false);
  }

  function resetState(m: string) {
    setMode(m as Mode);
    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 5, current: -1, label: 'Pick an example below or type your own request' });
    setScoreMsg(null);
    grpcStreamOpen.current = false;
    callRegistry.current.clear();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const examples = EXAMPLES[mode];

  return (
    <div className="flex flex-col">
      <ScoreToast message={scoreMsg} accentColor={accentColor} />

      <div className="p-6 flex flex-col gap-3">
        {/* Visualization box */}
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-xs font-mono text-[var(--muted)]">
              {mode === 'rest' ? 'https://api.example.com' : 'grpc://api.example.com:443'}
            </span>
            {busy && (
              <span
                className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor }}
              >
                simulating...
              </span>
            )}
          </div>

          {/* Animated canvas */}
          <div className="relative bg-[var(--bg)] flex-shrink-0" style={{ height: 190 }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.3,
              }}
            />
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <line x1="16%" y1="50%" x2="47%" y2="26%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="53%" y1="26%" x2="84%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="16%" y1="50%" x2="47%" y2="74%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="53%" y1="74%" x2="84%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
            </svg>

            {[
              { id: 'client',  icon: '💻', title: 'You',        sub: mode === 'rest' ? 'Browser'      : 'gRPC client',  xPct: 12, yPct: 50 },
              { id: 'server',  icon: '🖥️', title: 'API Server', sub: mode === 'rest' ? 'HTTP/1.1'    : 'HTTP/2 gRPC',  xPct: 88, yPct: 50 },
              { id: 'tcp',     icon: '🔗', title: mode === 'rest' ? 'TCP'  : 'HTTP/2',  sub: mode === 'rest' ? 'new per req' : 'multiplexed', xPct: 50, yPct: 26 },
              { id: 'payload', icon: mode === 'rest' ? '📄' : '⚡', title: mode === 'rest' ? 'JSON' : 'Protobuf', sub: mode === 'rest' ? '~400B text' : '~20B binary', xPct: 50, yPct: 74 },
            ].map((node) => (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                style={{
                  left: `${node.xPct}%`, top: `${node.yPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 78, height: 74,
                  background: 'var(--bg2)',
                  borderColor: glows.has(node.id) ? accentColor : 'var(--line2)',
                  boxShadow: glows.has(node.id)
                    ? `0 0 0 4px color-mix(in srgb, ${accentColor} 22%, transparent)`
                    : undefined,
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                <div className="text-xl leading-none">{node.icon}</div>
                <div className="text-[10px] font-bold text-[var(--text)] text-center leading-tight">{node.title}</div>
                <div className="text-[9px] font-mono text-[var(--muted)] text-center leading-tight">{node.sub}</div>
              </div>
            ))}

            {packets.map((pkt) => (
              <div
                key={pkt.id}
                className="absolute pointer-events-none z-20 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap"
                style={{
                  left: pkt.active ? `${pkt.toXPct}%` : `${pkt.fromXPct}%`,
                  top: `${pkt.yPct}%`,
                  transform: 'translateY(-50%)',
                  background: pkt.color,
                  color: pkt.textColor,
                  padding: '2px 10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: pkt.active ? `left ${pkt.dur}ms cubic-bezier(.4,0,.2,1)` : undefined,
                  opacity: pkt.active ? 1 : 0,
                }}
              >
                {pkt.label}
              </div>
            ))}
          </div>

          {/* Step bar */}
          <StepBar total={step.total} current={step.current} label={step.label} accentColor={accentColor} />

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Terminal — empty state or scrollable log */}
          {lines.length === 0 && !busy ? (
            <div className="mx-4 my-3">
              {beginnerMode ? (
                <PlaygroundHint
                  action={mode === 'rest'
                    ? "Click the 'GET /users' chip below, then hit Send"
                    : "Click any chip below, then hit Send"}
                  expect={mode === 'rest'
                    ? "You'll see a TCP handshake, JSON serialization, and response timing — then a side-by-side comparison with gRPC"
                    : "You'll see HTTP/2 stream reuse, Protobuf encoding, and how gRPC avoids repeating the TCP handshake on every call"}
                  accentColor={accentColor}
                />
              ) : (
                <div className="h-36 rounded-lg border border-[var(--line)] flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl opacity-30">⌨</span>
                  <span className="text-xs text-[var(--muted)]">Pick an example below to start the simulation</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative mx-4 my-3">
              <Terminal lines={lines} className="max-h-52 border-[var(--line)]" />
              {/* Expand button — sits on top-right of terminal header area */}
              <button
                type="button"
                onClick={() => setLogsExpanded(true)}
                title="Expand logs"
                className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono transition-colors"
                style={{
                  background: `color-mix(in srgb, ${accentColor} 12%, var(--bg1))`,
                  color: accentColor,
                  border: `1px solid color-mix(in srgb, ${accentColor} 25%, var(--line))`,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 4V1h3M9 4V1H6M1 6v3h3M9 6v3H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                expand
              </button>
            </div>
          )}

          {/* Full-screen log overlay */}
          {logsExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              onClick={() => setLogsExpanded(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
                style={{ background: 'var(--bg)', borderColor: accentColor + '44' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div
                  className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-2 text-xs font-mono text-[var(--muted)]">simulation log</span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-1"
                      style={{
                        background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                        color: accentColor,
                      }}
                    >
                      {lines.length} lines
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogsExpanded(false)}
                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-lg leading-none px-1"
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable log body — larger text for readability */}
                <div className="overflow-y-auto p-5 space-y-1.5 flex-1">
                  {lines.map((line) => (
                    <div key={line.id} className="flex items-start gap-3">
                      <span className="text-[11px] font-mono text-[var(--dim)] flex-shrink-0 mt-px w-14 text-right">
                        {line.timestamp}
                      </span>
                      <span
                        className="text-[11px] font-mono px-2 py-px rounded font-semibold flex-shrink-0 mt-px"
                        style={{
                          color: line.tagColor,
                          background: `color-mix(in srgb, ${line.tagColor} 12%, transparent)`,
                          minWidth: 36,
                          textAlign: 'center',
                        }}
                      >
                        {line.tag}
                      </span>
                      <span className="text-[13px] text-[var(--text2)] leading-relaxed flex-1 break-words">
                        {line.message}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="px-5 py-2.5 border-t flex-shrink-0 text-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}
                >
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    click outside or × to close
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What happened? — beginner mode summary */}
        <WhatHappenedPanel
          lines={lines}
          accentColor={accentColor}
          visible={!busy && lines.length > 0 && beginnerMode}
        />

        {/* Example chips — 4 clickable scenario cards */}
        <div className="flex-shrink-0">
          <p className="text-[10px] font-mono text-[var(--muted)] mb-2 px-0.5">
            {busy ? 'Watch the simulation above ↑' : `Try one of these ${mode.toUpperCase()} examples:`}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {examples.map((ex) => (
              <button
                key={ex.cmd}
                type="button"
                disabled={busy}
                onClick={() => handleSend(ex.cmd)}
                className="group relative rounded-xl border text-left px-3 py-2.5 transition-all flex flex-col gap-1"
                style={{
                  background: busy
                    ? 'var(--bg1)'
                    : `color-mix(in srgb, ${accentColor} 4%, var(--bg1))`,
                  borderColor: busy
                    ? 'var(--line)'
                    : `color-mix(in srgb, ${accentColor} 20%, var(--line))`,
                  opacity: busy ? 0.45 : 1,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {/* hover glow overlay */}
                {!busy && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `color-mix(in srgb, ${accentColor} 6%, transparent)` }}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{ex.icon}</span>
                  <span className="text-[10px] font-semibold text-[var(--text)] leading-tight">{ex.label}</span>
                </div>
                <code
                  className="text-[9px] font-mono leading-tight truncate block"
                  style={{ color: busy ? 'var(--muted)' : accentColor }}
                >
                  {ex.cmd}
                </code>
                <span className="text-[9px] text-[var(--muted)] leading-tight">{ex.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10">
      <InputBar
        modes={[{ id: 'rest', label: 'REST' }, { id: 'grpc', label: 'gRPC' }]}
        activeMode={mode}
        onModeChange={resetState}
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        placeholder={
          mode === 'rest'
            ? 'Or type your own: GET /products  ·  POST /orders  ·  bulk export'
            : 'Or type your own: GetProduct  ·  CreateOrder  ·  ListAll'
        }
        disabled={busy}
        accentColor={accentColor}
      />
      </div>
    </div>
  );
}
