'use client';

import { useRef, useState } from 'react';
import { Terminal, type LogLine } from '@/components/visualizer/shared/Terminal';
import { InputBar } from '@/components/visualizer/shared/InputBar';
import { StepBar } from '@/components/visualizer/shared/StepBar';
import { ScoreToast } from '@/components/visualizer/shared/ScoreToast';
import { cn, sleep, rand, ts } from '@/lib/utils';
import { SimDisclaimer } from '@/components/visualizer/shared/SimDisclaimer';
import { WhatHappenedPanel } from '@/components/visualizer/shared/WhatHappenedPanel';
import { PlaygroundHint } from '@/components/visualizer/shared/PlaygroundHint';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

const COLOR = 'var(--c-scale)';
type Mode = 'lb' | 'replica' | 'shard';

let _id = 0;
const lid = () => String(++_id);

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

const EXAMPLES: Record<Mode, { icon: string; label: string; cmd: string; hint: string }[]> = {
  lb: [
    { icon: '⚡', label: 'Burst traffic',   cmd: 'GET /api/feed (100 rps spike)',    hint: 'Watch least-connections balance the load' },
    { icon: '🔍', label: 'API request',     cmd: 'GET /api/users/42',               hint: 'Single request routed to least-busy server' },
    { icon: '📊', label: 'Heavy compute',   cmd: 'POST /api/generate-report',       hint: 'Long-running request holds a connection slot' },
    { icon: '💓', label: 'Health check',    cmd: 'GET /health',                     hint: 'LB polls this — failed checks remove a server' },
  ],
  replica: [
    { icon: '📖', label: 'Read users',      cmd: 'GET /users',                      hint: 'Read → routed to replica, primary protected' },
    { icon: '✏️', label: 'Update profile',  cmd: 'PUT /users/42 (write)',           hint: 'Write → must go to primary' },
    { icon: '➕', label: 'Insert order',    cmd: 'INSERT INTO orders (write)',       hint: 'All writes → primary → async replicate' },
    { icon: '📈', label: 'Analytics query', cmd: 'SELECT COUNT(*) (read)',          hint: 'Heavy reads → replica, never touch primary' },
  ],
  shard: [
    { icon: '👤', label: 'User lookup',     cmd: 'user_id=1234 SELECT',             hint: 'hash(1234) % 4 = deterministic shard' },
    { icon: '🌟', label: 'Popular user',    cmd: 'user_id=1 (celebrity)',           hint: 'Same key → same shard every time' },
    { icon: '🆕', label: 'New signup',      cmd: 'INSERT user_id=9999',             hint: 'New users distributed by hash' },
    { icon: '🔗', label: 'Cross-shard',     cmd: 'SELECT JOIN across users',        hint: 'Cross-shard query — the costly case' },
  ],
};

export function ScalePlayground() {
  const [mode, setMode] = useState<Mode>('lb');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [lbCounters, setLbCounters] = useState([0, 0, 0]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({ total: 4, current: -1, label: 'Pick an example above to simulate traffic' });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();

  const runRef = useRef(0);

  function setStep(current: number, label: string) {
    setStepState({ total: 4, current, label });
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
    label: string, color: string, textColor: string, dur = 480,
  ) {
    const id = `p${Date.now()}${Math.random()}`;
    setPackets((prev) => [...prev, { id, label, color, textColor, fromXPct, toXPct, yPct, active: false, dur }]);
    await sleep(32);
    setPackets((prev) => prev.map((p) => p.id === id ? { ...p, active: true } : p));
    await sleep(dur + 80);
    setPackets((prev) => prev.filter((p) => p.id !== id));
  }

  async function slowLine(tag: string, tagColor: string, msg: string, ms = 400) {
    setLines((p) => [...p, { id: lid(), tag, tagColor, message: msg, timestamp: ts() }]);
    await sleep(ms);
  }

  async function handleSend(override?: string) {
    if (busy) return;
    const run = ++runRef.current;

    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 4, current: -1, label: 'Running...' });
    setScoreMsg(null);
    setInput('');
    setBusy(true);

    if (mode === 'lb') {
      const chip = override ?? EXAMPLES.lb[0]!.cmd;
      const isHeavy = chip.includes('report') || chip.includes('heavy');

      // Pick least-loaded server
      const counters = lbCounters;
      const minConns = Math.min(...counters);
      const target = counters.indexOf(minConns);

      setStep(0, `Request in — checking server loads: s1:${counters[0]} s2:${counters[1]} s3:${counters[2]}`);
      pulseGlow('client');
      await slowLine('REQ', COLOR, `incoming: ${chip}`, 320);
      await slowLine('WHY', '#a78bfa', `WHY: least-connections algorithm picks server-${target + 1} (${minConns} active).`, 420);

      setLbCounters((prev) => { const n = [...prev]; n[target]! += 1; return n; });

      await flyPkt(17, 43, 50, '→ LB', COLOR, '#000', 400);
      if (run !== runRef.current) return;
      pulseGlow('router');
      await slowLine('LB', COLOR, `least-conn → server-${target + 1}  (${minConns} active connections)`, 380);

      setStep(1, `Routing to server-${target + 1}...`);
      await flyPkt(57, 78, 50, `→ srv-${target + 1}`, COLOR, '#000', 400);
      if (run !== runRef.current) return;
      pulseGlow('servers');

      const ms = isHeavy ? rand(300, 600) : rand(25, 80);
      await sleep(Math.min(ms, 150));
      setStep(2, `Server-${target + 1} processing... (${ms}ms)`);
      await slowLine('SRV', 'var(--muted)', `server-${target + 1} handling request (${ms}ms response time)`, Math.min(ms, 280));

      if (isHeavy) {
        await slowLine('IMP', '#f59e0b', `IMP: long-running request holds slot on server-${target + 1}. Other servers still free.`, 400);
      }

      await flyPkt(78, 17, 50, '200 OK', '#0a1828', 'var(--c-api)', 480);
      if (run !== runRef.current) return;
      pulseGlow('client');
      await slowLine('200', 'var(--c-api)', `response from server-${target + 1}  (${ms}ms)`, 280);

      setLbCounters((prev) => { const n = [...prev]; n[target]! = Math.max(0, (n[target] ?? 0) - 1); return n; });
      setStep(3, `Done — spread across 3 servers. No single point of failure.`);
      showScore(`LB → server-${target + 1} · ${ms}ms · least-conn`);

    } else if (mode === 'replica') {
      const chip = override ?? EXAMPLES.replica[0]!.cmd;
      const isWrite = chip.toLowerCase().includes('write') || chip.toLowerCase().includes('put') ||
                      chip.toLowerCase().includes('insert') || chip.toLowerCase().includes('update') ||
                      chip.toLowerCase().includes('delete') || chip.toLowerCase().includes('post');

      setStep(0, `Detecting operation type: ${isWrite ? 'WRITE' : 'READ'}...`);
      pulseGlow('client');
      await slowLine(isWrite ? 'WRT' : 'RD', COLOR, chip, 300);
      await slowLine('WHY', '#a78bfa', isWrite
        ? 'WHY: writes must go to primary — replicas are read-only. Primary then replicates asynchronously.'
        : 'WHY: reads are routed to a replica — primary is protected for writes only.',
        440);

      if (isWrite) {
        setStep(1, 'Write → Primary (replicas read-only)...');
        await flyPkt(17, 43, 45, '→ Router', COLOR, '#000', 380);
        if (run !== runRef.current) return;
        pulseGlow('router');
        await slowLine('RTR', 'var(--muted)', 'router: WRITE detected → primary', 300);
        await flyPkt(57, 78, 45, 'WRITE → Pri', COLOR, '#000', 420);
        if (run !== runRef.current) return;
        pulseGlow('servers');
        const ms = rand(50, 100);
        await sleep(ms);
        await slowLine('PRI', COLOR, `primary: committed (${ms}ms) + WAL written`, 360);
        await slowLine('REP', 'var(--muted)', 'async replication → replica-1, replica-2  (< 100ms lag)', 380);
        await slowLine('IMP', '#f59e0b', `IMP: only primary touched for writes. Replicas lag ~50ms — acceptable for most apps.`, 420);
        setStep(3, 'WRITE committed on primary, replicating...');
        showScore(`Write → Primary · ${ms}ms · 2 replicas syncing`);
      } else {
        const rep = rand(1, 2);
        setStep(1, `Read → replica-${rep} (primary free for writes)...`);
        await flyPkt(17, 43, 55, '→ Router', COLOR, '#000', 380);
        if (run !== runRef.current) return;
        pulseGlow('router');
        await slowLine('RTR', 'var(--muted)', `router: READ detected → replica-${rep}`, 300);
        await flyPkt(57, 78, 55, `READ → rep-${rep}`, 'var(--c-api)', '#000', 420);
        if (run !== runRef.current) return;
        pulseGlow('servers');
        const ms = rand(15, 55);
        await sleep(ms);
        await slowLine('REP', 'var(--c-api)', `replica-${rep}: returned data (${ms}ms, data ≤ 100ms old)`, 360);
        await slowLine('IMP', '#f59e0b', `IMP: primary saw 0 reads this request. Add more replicas to linearly scale read capacity.`, 420);
        await flyPkt(78, 17, 55, '200 OK', '#0a1828', 'var(--c-api)', 480);
        if (run !== runRef.current) return;
        pulseGlow('client');
        setStep(3, `Read from replica-${rep} — primary untouched`);
        showScore(`Read → replica-${rep} · ${ms}ms · Primary 0 reads`);
      }

    } else {
      // Shard mode
      const chip = override ?? EXAMPLES.shard[0]!.cmd;
      const isCross = chip.includes('JOIN') || chip.includes('cross');
      const userId = rand(1000, 9999);
      const shard = userId % 4;

      setStep(0, `Routing to shard: hash(${userId}) % 4 = ${shard}`);
      pulseGlow('client');
      await slowLine('REQ', COLOR, `${chip}  [user_id=${userId}]`, 300);
      await slowLine('WHY', '#a78bfa', `WHY: hash(${userId}) % 4 = ${shard} — deterministic, same key always hits shard-${shard}.`, 440);

      await flyPkt(17, 43, 50, `uid=${userId}`, COLOR, '#000', 400);
      if (run !== runRef.current) return;
      pulseGlow('router');
      await slowLine('SHD', COLOR, `hash(${userId}) % 4 → shard-${shard}`, 340);

      setStep(1, `Routing to shard-${shard} (25% of all data)`);
      await flyPkt(57, 78, 50, `→ shard-${shard}`, COLOR, '#000', 420);
      if (run !== runRef.current) return;
      pulseGlow('servers');

      if (isCross) {
        await slowLine('WARN', '#f87171', `WARN: cross-shard JOIN requires querying all 4 shards and merging in app layer.`, 400);
        await slowLine('IMP', '#f59e0b', `IMP: cross-shard queries are expensive. Redesign schema or denormalize to avoid them.`, 420);
        const ms = rand(80, 150);
        await sleep(ms);
        await slowLine('200', 'var(--c-api)', `merged result from 4 shards  (${ms}ms — 4× single-shard cost)`, 300);
        setStep(3, `Cross-shard query — hit all 4 shards. Costly!`);
        showScore(`Cross-shard: 4 shards queried · ${ms}ms · avoid with good key choice`);
      } else {
        const ms = rand(8, 35);
        await sleep(ms);
        await slowLine('200', 'var(--c-api)', `shard-${shard} returned data  (${ms}ms, searched 25% of dataset)`, 300);
        await slowLine('INS', '#34d399', `INS: at 1B rows, this shard holds only 250M rows. Query is 4× faster than unsharded.`, 400);
        await flyPkt(78, 17, 50, '200 OK', '#0a1828', 'var(--c-api)', 480);
        if (run !== runRef.current) return;
        pulseGlow('client');
        setStep(3, `Shard-${shard} served it — searched 25% of total data`);
        showScore(`Shard-${shard} · uid=${userId} · ${ms}ms · 25% of data`);
      }
    }

    if (run !== runRef.current) return;
    setBusy(false);
  }

  const examples = EXAMPLES[mode];
  const modeLabel = mode === 'lb' ? 'load balancer' : mode === 'replica' ? 'replication' : 'sharding';

  return (
    <div className="flex flex-col">
      <ScoreToast message={scoreMsg} accentColor={COLOR} />

      {/* Expanded log overlay */}
      {logsExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setLogsExpanded(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: 'var(--bg1)', borderColor: 'var(--line)', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-mono" style={{ color: COLOR }}>traffic log — {modeLabel}</span>
              <button
                type="button"
                onClick={() => setLogsExpanded(false)}
                className="text-xs font-mono px-2 py-0.5 rounded border"
                style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}
              >
                × close
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-1.5" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {lines.length === 0 ? (
                <p className="text-[12px] text-[var(--muted)] font-mono">No logs yet.</p>
              ) : lines.map((l) => (
                <div key={l.id} className="flex items-start gap-3 font-mono text-[13px] leading-relaxed">
                  <span className="text-[10px] text-[var(--muted)] flex-shrink-0 mt-0.5">{l.timestamp}</span>
                  <span
                    className="text-[10px] font-bold flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                    style={{ color: l.tagColor, background: `color-mix(in srgb, ${l.tagColor} 12%, transparent)` }}
                  >
                    {l.tag}
                  </span>
                  <span className="text-[var(--text2)]">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col gap-4">
        {/* Example chips */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          {examples.map((ex) => (
            <button
              key={ex.cmd}
              type="button"
              disabled={busy}
              onClick={() => handleSend(ex.cmd)}
              className="flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--line)',
                opacity: busy ? 0.4 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{ex.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text)] mb-0.5">{ex.label}</p>
                <p className="text-[10px] font-mono truncate" style={{ color: COLOR }}>{ex.cmd}</p>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">{ex.hint}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Visualizer card */}
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-1 text-xs font-mono text-[var(--muted)]">
              {mode === 'lb' ? 'load balancer — least connections' : mode === 'replica' ? 'primary + 2 read replicas' : 'shard router — hash(user_id) % 4'}
            </span>
          </div>

          {/* Animated node strip */}
          <div className="relative bg-[var(--bg)] flex-shrink-0" style={{ height: 110 }}>
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
              <line x1="17%" y1="50%" x2="43%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="57%" y1="50%" x2="78%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
            </svg>

            {[
              { id: 'client',  icon: '💻', title: 'You',           sub: 'traffic source',                                      xPct: 10 },
              { id: 'router',  icon: mode === 'lb' ? '⚖️' : mode === 'shard' ? '🧭' : '🔀',
                title: mode === 'lb' ? 'Load Balancer' : mode === 'shard' ? 'Shard Router' : 'Router',
                sub: mode === 'lb' ? 'least-conn' : mode === 'shard' ? 'hash(uid)%4' : 'W→primary R→replica', xPct: 50 },
              { id: 'servers', icon: mode === 'replica' ? '🗄️' : '🖥️',
                title: mode === 'lb' ? 'Server Pool' : mode === 'replica' ? 'DB Nodes' : 'Shard Pool',
                sub: mode === 'lb' ? '3 servers' : mode === 'replica' ? 'primary + replicas' : '4 shards',    xPct: 88 },
            ].map((node) => (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                style={{
                  left: `${node.xPct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 80,
                  height: 70,
                  background: 'var(--bg2)',
                  borderColor: glows.has(node.id) ? COLOR : 'var(--line2)',
                  boxShadow: glows.has(node.id)
                    ? `0 0 0 4px color-mix(in srgb, ${COLOR} 22%, transparent)`
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
                  padding: '2px 9px',
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
          <StepBar total={step.total} current={step.current} label={step.label} accentColor={COLOR} />

          {/* Visualization panels */}
          <div className="overflow-y-auto max-h-52 p-4 pt-3">
            {mode === 'lb' && (
              <div className="grid grid-cols-3 gap-3">
                {lbCounters.map((count, i) => (
                  <div
                    key={i}
                    className={cn('bg-[var(--bg2)] border rounded-lg p-4 text-center transition-all', count > 0 ? 'border-[var(--c-scale)]/40' : 'border-[var(--line)]')}
                  >
                    <p className="text-[10px] font-mono text-[var(--muted)] mb-1">server-{i + 1}</p>
                    <p className="text-2xl font-bold" style={{ color: count > 0 ? COLOR : 'var(--dim)' }}>{count}</p>
                    <p className="text-[9px] text-[var(--muted)]">active conns</p>
                  </div>
                ))}
              </div>
            )}
            {mode === 'replica' && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'primary',   access: 'R / W',   accent: true  },
                  { label: 'replica-1', access: 'read only', accent: false },
                  { label: 'replica-2', access: 'read only', accent: false },
                ].map((node, i) => (
                  <div
                    key={i}
                    className={cn('bg-[var(--bg2)] border rounded-lg p-4 text-center', node.accent ? 'border-[var(--c-scale)]/40' : 'border-[var(--line)]')}
                  >
                    <p className="text-[10px] font-mono mb-1" style={{ color: node.accent ? COLOR : 'var(--muted)' }}>{node.label}</p>
                    <p className="text-xs text-[var(--text2)]">{node.access}</p>
                    <p className="text-[9px] text-[var(--muted)] mt-1">{i === 0 ? 'source of truth' : 'async replica'}</p>
                  </div>
                ))}
              </div>
            )}
            {mode === 'shard' && (
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-[var(--bg2)] border border-[var(--line)] rounded-lg p-3 text-center">
                    <p className="text-[10px] font-mono mb-1" style={{ color: COLOR }}>shard-{i}</p>
                    <p className="text-[9px] text-[var(--text2)]">uid % 4 = {i}</p>
                    <p className="text-[9px] text-[var(--muted)] mt-1">25% of data</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Log terminal */}
          <div className="relative mx-4 mb-4 mt-1">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setLogsExpanded(true)}
                className="absolute top-2 right-2 z-10 text-[9px] font-mono px-2 py-0.5 rounded border"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, ${COLOR} 30%, transparent)`, background: 'var(--bg2)' }}
              >
                ⤢ expand
              </button>
            )}
            {lines.length === 0 && !busy ? (
              beginnerMode ? (
                <PlaygroundHint
                  action={mode === 'lb'
                    ? "Click 'GET /feed' above to send a request through the load balancer"
                    : mode === 'replica'
                    ? "Click 'SELECT posts' above to see a read routed to a replica"
                    : "Click 'New signup' above to watch consistent hash sharding in action"}
                  expect={mode === 'lb'
                    ? "See the least-connections algorithm pick which server handles your request — and why that beats round-robin"
                    : mode === 'replica'
                    ? "Watch how reads go to replicas (protecting the primary) while writes must hit the primary"
                    : "See how hash(user_id) % 4 deterministically routes the same user to the same shard every time"}
                  accentColor={COLOR}
                />
              ) : (
                <div
                  className="h-32 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
                >
                  <p className="text-[11px] text-[var(--muted)] font-mono">Pick an example above to simulate traffic</p>
                </div>
              )
            ) : (
              <Terminal lines={lines} className="h-32 border-[var(--line)]" />
            )}
          </div>
        </div>
      </div>

      {/* What happened? — beginner mode summary */}
      <WhatHappenedPanel
        lines={lines}
        accentColor={COLOR}
        visible={!busy && lines.length > 0 && beginnerMode}
      />

      <div className="sticky bottom-0 z-10">
      <InputBar
        modes={[{ id: 'lb', label: 'Load Balancer' }, { id: 'replica', label: 'Replication' }, { id: 'shard', label: 'Sharding' }]}
        activeMode={mode}
        onModeChange={(m) => {
          setMode(m as Mode);
          setLines([]);
          setLbCounters([0, 0, 0]);
          setPackets([]);
          setGlows(new Set());
          setStepState({ total: 4, current: -1, label: 'Pick an example above to simulate traffic' });
          setScoreMsg(null);
        }}
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        placeholder="Send traffic or click an example chip…"
        disabled={busy}
        accentColor={COLOR}
      />
      </div>
    </div>
  );
}
