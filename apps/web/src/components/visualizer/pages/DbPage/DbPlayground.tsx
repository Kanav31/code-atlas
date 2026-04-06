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

const COLOR = 'var(--c-db)';
type Mode = 'scan' | 'index' | 'acid';

const DB_ROWS = [
  { id: 1, name: 'Alice Chen',   email: 'alice@co.io',  role: 'engineer' },
  { id: 2, name: 'Bob Kim',      email: 'bob@co.io',    role: 'designer' },
  { id: 3, name: 'Carol Singh',  email: 'carol@co.io',  role: 'manager'  },
  { id: 4, name: 'Dan Wu',       email: 'dan@co.io',    role: 'engineer' },
  { id: 5, name: 'Eve Park',     email: 'eve@co.io',    role: 'engineer' },
  { id: 6, name: 'Frank Liu',    email: 'frank@co.io',  role: 'designer' },
  { id: 7, name: 'Grace Ho',     email: 'grace@co.io',  role: 'manager'  },
  { id: 8, name: 'Hiro Tanaka',  email: 'hiro@co.io',   role: 'engineer' },
];

let _id = 0;
const lid = () => String(++_id);

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

const EXAMPLES: Record<Mode, { icon: string; label: string; cmd: string; hint: string }[]> = {
  scan: [
    { icon: '👤', label: 'Find by name',  cmd: "WHERE name = 'Alice Chen'",   hint: 'No index on name — scans all 8 rows' },
    { icon: '👥', label: 'Find by role',  cmd: "WHERE role = 'engineer'",     hint: 'Low cardinality — seq scan wins here' },
    { icon: '🔢', label: 'Count all',     cmd: 'SELECT COUNT(*) FROM users',  hint: 'Must touch every row to count' },
    { icon: '📧', label: 'Email search',  cmd: "WHERE email LIKE '%co.io'",   hint: 'LIKE with leading % can\'t use index' },
  ],
  index: [
    { icon: '🎯', label: 'Lookup by ID',    cmd: 'WHERE id = 5',               hint: 'Primary key — perfect B-tree hit' },
    { icon: '📏', label: 'Range query',     cmd: 'WHERE id BETWEEN 2 AND 6',   hint: 'B-tree excels at range scans' },
    { icon: '📧', label: 'Email index',     cmd: "WHERE email = 'bob@co.io'",  hint: 'Indexed email — 3 comparisons' },
    { icon: '🔀', label: 'Order by index',  cmd: 'ORDER BY id LIMIT 3',        hint: 'Index already sorted — no sort step' },
  ],
  acid: [
    { icon: '💸', label: 'Transfer $100',    cmd: 'Transfer $100 → Account 2',  hint: 'Both updates or neither — atomicity' },
    { icon: '🔄', label: 'Retry payment',    cmd: 'Retry failed payment',       hint: 'Watch rollback on constraint fail' },
    { icon: '⚡', label: 'Double spend',     cmd: 'Duplicate transfer attempt',  hint: '~35% chance of rollback' },
    { icon: '🔐', label: 'Lock & commit',    cmd: 'Locked transfer commit',      hint: 'See WAL flush on COMMIT' },
  ],
};

export function DbPlayground() {
  const [mode, setMode] = useState<Mode>('scan');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [highlighted, setHighlighted] = useState<Record<number, 'scan' | 'match' | 'skip'>>({});
  const [txnState, setTxnState] = useState<'idle' | 'running' | 'committed' | 'rolledback'>('idle');
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({ total: 5, current: -1, label: 'Pick an example above — watch the query execute row by row' });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();

  const runRef = useRef(0);

  function setStep(current: number, label: string, total = 5) {
    setStepState({ total, current, label });
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
    label: string, color: string, textColor: string, dur = 550,
  ) {
    const id = `p${Date.now()}${Math.random()}`;
    setPackets((prev) => [...prev, { id, label, color, textColor, fromXPct, toXPct, yPct, active: false, dur }]);
    await sleep(32);
    setPackets((prev) => prev.map((p) => p.id === id ? { ...p, active: true } : p));
    await sleep(dur + 80);
    setPackets((prev) => prev.filter((p) => p.id !== id));
  }

  function addLine(tag: string, tagColor: string, message: string) {
    setLines((p) => [...p, { id: lid(), tag, tagColor, message, timestamp: ts() }]);
  }

  async function slowLine(tag: string, tagColor: string, msg: string, ms = 420) {
    addLine(tag, tagColor, msg);
    await sleep(ms);
  }

  async function handleSend(override?: string) {
    if (busy) return;
    const run = ++runRef.current;

    // Clear everything for the new run
    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setHighlighted({});
    setTxnState('idle');
    setStepState({ total: 5, current: -1, label: 'Running...' });
    setScoreMsg(null);
    setInput('');
    setBusy(true);

    const targetId = rand(1, 8);

    if (mode === 'scan') {
      const chip = override ?? EXAMPLES.scan[0]!.cmd;
      setStep(0, 'Issuing query — planner chooses sequential scan...', 5);
      pulseGlow('client');
      await slowLine('SQL', COLOR, `SELECT * FROM users ${chip}`, 300);
      await slowLine('PLN', 'var(--muted)', 'Query plan: Seq Scan on users  (cost=0.00..180.00 rows=8 width=64)', 380);
      await slowLine('WHY', '#a78bfa', 'WHY: No index on this column — must check every row sequentially.', 420);

      await flyPkt(22, 78, 50, 'SELECT query', COLOR, '#000', 520);
      if (run !== runRef.current) return;
      pulseGlow('db');
      await sleep(100);

      setStep(1, 'Reading rows from disk — page by page...', 5);
      let scanned = 0;
      for (let i = 0; i < DB_ROWS.length; i++) {
        if (run !== runRef.current) return;
        const row = DB_ROWS[i]!;
        await sleep(rand(140, 220));
        setStep(Math.min(1 + Math.floor(i / 2), 3), `Checking row ${i + 1} / ${DB_ROWS.length}...`);
        if (row.id === targetId || chip.includes(row.name) || (chip.includes('engineer') && row.role === 'engineer') || i === DB_ROWS.length - 2) {
          setHighlighted((h) => ({ ...h, [row.id]: 'match' }));
          await slowLine('HIT', 'var(--c-api)', `row ${row.id}: ${row.name}  ← MATCH`, 280);
          scanned++;
          if (!chip.includes('COUNT') && !chip.includes('role') && !chip.includes('LIKE')) break;
        } else {
          setHighlighted((h) => ({ ...h, [row.id]: 'scan' }));
          await slowLine('CHK', 'var(--muted)', `row ${row.id}: ${row.name}  (checked, not matched)`, 160);
          scanned++;
        }
      }
      if (run !== runRef.current) return;
      await slowLine('INF', 'var(--muted)', `Scanned ${scanned}/${DB_ROWS.length} rows  (${rand(8, 18)}ms)`, 300);
      await slowLine('IMP', '#f59e0b', `IMP: At 10M rows this would be ~800ms. An index on this column → <1ms.`, 420);

      await flyPkt(78, 22, 50, `${scanned} rows`, '#0a1828', COLOR, 500);
      if (run !== runRef.current) return;
      pulseGlow('client');
      setStep(4, `Done — scanned ${scanned} rows. O(n). Try the B-tree tab.`);
      showScore(`Full scan: ${scanned}/${DB_ROWS.length} rows read · O(n) · ${rand(8, 18)}ms`);

    } else if (mode === 'index') {
      const chip = override ?? EXAMPLES.index[0]!.cmd;
      setStep(0, 'Issuing query — planner uses B-tree index...', 5);
      pulseGlow('client');
      await slowLine('SQL', COLOR, `SELECT * FROM users ${chip}`, 300);
      await slowLine('PLN', 'var(--muted)', `Index Scan using users_pkey  (cost=0.15..8.17 rows=1 width=64)`, 380);
      await slowLine('WHY', '#a78bfa', `WHY: Primary key has a B-tree index. Planner picks it over seq scan.`, 420);

      await flyPkt(22, 78, 50, `INDEX query`, COLOR, '#000', 520);
      if (run !== runRef.current) return;
      pulseGlow('db');
      await sleep(100);

      setStep(1, 'Traversing B-tree — root → internal → leaf...', 5);
      const treeSteps = Math.ceil(Math.log2(DB_ROWS.length));
      const treeLabels = ['root node', 'internal node', 'leaf page'];
      for (let i = 0; i < treeSteps; i++) {
        if (run !== runRef.current) return;
        await sleep(rand(40, 80));
        setStep(i + 1, `B-tree: step ${i + 1}/${treeSteps} — ${treeLabels[i] ?? 'node'}`);
        await slowLine('IDX', COLOR, `B-tree compare step ${i + 1}/${treeSteps}: traverse ${treeLabels[i] ?? 'node'}`, 280);
      }

      if (run !== runRef.current) return;
      const row = DB_ROWS.find((r) => r.id === targetId) ?? DB_ROWS[0]!;
      setHighlighted({ [row.id]: 'match' });
      await slowLine('HIT', 'var(--c-api)', `row ${row.id}: ${row.name}  (${rand(1, 3)}ms, ${treeSteps} comparisons)`, 300);
      await slowLine('IMP', '#f59e0b', `IMP: Same ${treeSteps} comparisons on 10M rows as on 8 rows. Index height grows by 1 per 10× rows.`, 440);

      await flyPkt(78, 22, 50, `row id=${row.id}`, '#0a1828', COLOR, 500);
      if (run !== runRef.current) return;
      pulseGlow('client');
      setStep(4, `Done — ${treeSteps} comparisons. O(log n). Same on 10B rows.`);
      showScore(`Index scan: ${treeSteps} comparisons · O(log n) · ${rand(1, 3)}ms`);

    } else {
      // ACID mode
      setTxnState('running');
      setStep(0, 'BEGIN — acquiring row-level locks...', 5);
      pulseGlow('client');
      await slowLine('TXN', COLOR, 'BEGIN TRANSACTION', 320);
      await slowLine('WHY', '#a78bfa', 'WHY: Transaction groups both UPDATEs into one atomic unit — neither or both.', 440);

      setStep(1, 'Step 2: Deducting $100 from Account 1...');
      await slowLine('SQL', COLOR, 'UPDATE accounts SET balance = balance - 100 WHERE id = 1', 380);
      await flyPkt(22, 78, 42, 'UPDATE acct-1', COLOR, '#000', 500);
      if (run !== runRef.current) return;
      pulseGlow('db');
      await slowLine('WAL', 'var(--muted)', 'WAL write: acct-1  $1000 → $900  (not yet visible to others)', 380);

      setStep(2, 'Step 3: Crediting $100 to Account 2...');
      await slowLine('SQL', COLOR, 'UPDATE accounts SET balance = balance + 100 WHERE id = 2', 380);
      await flyPkt(22, 78, 58, 'UPDATE acct-2', COLOR, '#000', 500);
      if (run !== runRef.current) return;
      await slowLine('WAL', 'var(--muted)', 'WAL write: acct-2  $500 → $600  (not yet visible to others)', 380);

      if (Math.random() < 0.35) {
        // Rollback path
        setStep(3, 'Step 4: Constraint violation — rolling back!');
        await slowLine('ERR', '#f87171', 'ERROR: constraint violation — balance cannot go negative', 360);
        await slowLine('RBK', '#f87171', 'ROLLBACK — WAL entries discarded, no rows changed', 380);
        await slowLine('IMP', '#f59e0b', 'IMP: Atomicity preserved — Account 1 and Account 2 unchanged.', 420);
        setTxnState('rolledback');
        await flyPkt(78, 22, 50, 'ROLLBACK ✗', '#f87171', '#fff', 500);
        if (run !== runRef.current) return;
        pulseGlow('client');
        setStep(4, 'ROLLBACK — zero rows changed. Atomicity preserved.');
        showScore(`ACID: Transaction ROLLED BACK · 0 rows changed · data safe`);
      } else {
        // Commit path
        setStep(3, 'Step 4: Flushing WAL to disk — COMMIT...');
        await slowLine('CMT', 'var(--c-api)', 'COMMIT — WAL flushed to durable storage', 360);
        await slowLine('DUR', 'var(--c-api)', 'Durability: data survives crash from this point forward', 380);
        await slowLine('ISO', 'var(--muted)', 'Isolation: changes now visible to other transactions', 380);
        setTxnState('committed');
        await flyPkt(78, 22, 50, 'COMMIT ✓', 'var(--c-api)', '#000', 500);
        if (run !== runRef.current) return;
        pulseGlow('client');
        setStep(4, '✓ COMMIT — A+C+I+D all satisfied.');
        showScore(`ACID: COMMITTED · A+C+I+D ✓ · 2 rows changed`);
      }

      await sleep(1500);
      if (run !== runRef.current) return;
      setTxnState('idle');
    }

    if (run !== runRef.current) return;
    setBusy(false);
  }

  const rowStyle = (id: number) => {
    const state = highlighted[id];
    if (state === 'match') return 'bg-emerald-500/10 border-emerald-500/30';
    if (state === 'scan')  return 'bg-blue-500/8 border-blue-500/15';
    return 'bg-[var(--bg2)] border-[var(--line)]';
  };

  const examples = EXAMPLES[mode];
  const modeLabel = mode === 'scan' ? 'seq scan' : mode === 'index' ? 'index scan' : 'ACID txn';

  return (
    <div className="flex flex-col h-full">
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
              <span className="text-xs font-mono" style={{ color: COLOR }}>query log — {modeLabel}</span>
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

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
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
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-1 text-xs font-mono text-[var(--muted)]">table: users</span>
            {txnState !== 'idle' && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-2"
                style={{ color: COLOR, backgroundColor: 'color-mix(in srgb, var(--c-db) 12%, transparent)' }}
              >
                {txnState}
              </span>
            )}
          </div>

          {/* Animated node strip */}
          <div className="relative bg-[var(--bg)] flex-shrink-0" style={{ height: 100 }}>
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
              <line x1="19%" y1="50%" x2="81%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
            </svg>

            {[
              { id: 'client', icon: '💻', title: 'Your Query', sub: 'SQL client', xPct: 14 },
              { id: 'db', icon: '🗄️', title: mode === 'index' ? 'B-tree Index' : 'users table', sub: mode === 'index' ? 'O(log n)' : mode === 'acid' ? 'ACID txn' : 'Seq Scan', xPct: 86 },
            ].map((node) => (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                style={{
                  left: `${node.xPct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 78,
                  height: 66,
                  background: 'var(--bg2)',
                  borderColor: glows.has(node.id) ? COLOR : 'var(--line2)',
                  boxShadow: glows.has(node.id)
                    ? `0 0 0 4px color-mix(in srgb, ${COLOR} 22%, transparent)`
                    : undefined,
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                <div className="text-lg leading-none">{node.icon}</div>
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

          {/* Step progress */}
          <StepBar total={step.total} current={step.current} label={step.label} accentColor={COLOR} />

          {/* Table / account visualization */}
          <div className="flex-1 overflow-y-auto">
            {mode !== 'acid' ? (
              <div className="p-3 space-y-1">
                {DB_ROWS.map((row) => (
                  <div
                    key={row.id}
                    className={cn('flex items-center gap-4 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200', rowStyle(row.id))}
                  >
                    <span className="text-[var(--muted)] w-4">{row.id}</span>
                    <span className="text-[var(--text)] w-28">{row.name}</span>
                    <span className="text-[var(--text2)] w-32">{row.email}</span>
                    <span className="text-[var(--muted)]">{row.role}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4">
                {[
                  { label: 'Account #1', base: '$1,000', committed: '$900' },
                  { label: 'Account #2', base: '$500',   committed: '$600' },
                ].map((acct, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl border p-5 text-center transition-all',
                      txnState === 'running'    ? 'border-amber-500/40 bg-amber-500/5'
                      : txnState === 'committed'  ? 'border-emerald-500/40 bg-emerald-500/5'
                      : txnState === 'rolledback' ? 'border-red-500/40 bg-red-500/5'
                      : 'bg-[var(--bg2)] border-[var(--line)]',
                    )}
                  >
                    <p className="text-xs font-mono text-[var(--muted)] mb-1">account-{i + 1}</p>
                    <p className="text-2xl font-bold text-[var(--text)]">
                      {txnState === 'committed' ? acct.committed : acct.base}
                    </p>
                    {txnState === 'running' && (
                      <p className="text-[9px] font-mono text-amber-400 mt-1">in transaction...</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Log terminal with expand button */}
          <div className="relative mx-4 mb-4 mt-1">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setLogsExpanded(true)}
                className="absolute top-2 right-2 z-10 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, ${COLOR} 30%, transparent)`, background: 'var(--bg2)' }}
              >
                ⤢ expand
              </button>
            )}
            {lines.length === 0 && !busy ? (
              beginnerMode ? (
                <PlaygroundHint
                  action={mode === 'scan'
                    ? "Click 'Alice Chen' above to run a full sequential scan"
                    : mode === 'index'
                    ? "Click 'Alice Chen' above to see how a B-tree index speeds up the same query"
                    : "Click 'Transfer $50' above to watch an ACID transaction in action"}
                  expect={mode === 'scan'
                    ? "Watch the database inspect every row one by one — expensive at scale, but simple to understand"
                    : mode === 'index'
                    ? "See how B-tree comparisons jump straight to the result instead of scanning all rows — O(log n) vs O(n)"
                    : "See how Atomicity ensures both account balances update together — or neither does if something fails"}
                  accentColor={COLOR}
                />
              ) : (
                <div
                  className="h-32 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
                >
                  <p className="text-[11px] text-[var(--muted)] font-mono">Pick an example above to run a query</p>
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

      <InputBar
        modes={[{ id: 'scan', label: 'Full Scan' }, { id: 'index', label: 'B-tree Index' }, { id: 'acid', label: 'ACID Txn' }]}
        activeMode={mode}
        onModeChange={(m) => {
          setMode(m as Mode);
          setLines([]);
          setHighlighted({});
          setTxnState('idle');
          setPackets([]);
          setGlows(new Set());
          setStepState({ total: 5, current: -1, label: 'Pick an example above — watch the query execute row by row' });
          setScoreMsg(null);
        }}
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        placeholder={mode === 'acid' ? 'Press send or click a chip above…' : 'Enter a query or click an example chip…'}
        disabled={busy}
        accentColor={COLOR}
      />
    </div>
  );
}
