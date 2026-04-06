'use client';

import { useState } from 'react';
import { Terminal, type LogLine } from '@/components/visualizer/shared/Terminal';
import { InputBar } from '@/components/visualizer/shared/InputBar';
import { StepBar } from '@/components/visualizer/shared/StepBar';
import { ScoreToast } from '@/components/visualizer/shared/ScoreToast';
import { sleep, rand, ts } from '@/lib/utils';
import { SimDisclaimer } from '@/components/visualizer/shared/SimDisclaimer';
import { WhatHappenedPanel } from '@/components/visualizer/shared/WhatHappenedPanel';
import { PlaygroundHint } from '@/components/visualizer/shared/PlaygroundHint';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

const COLOR = 'var(--c-kafka)';
type Key = 'user_id' | 'order_id' | 'random';

let _id = 0;
const lid = () => String(++_id);

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

function hashPartition(key: string, partitions: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % partitions;
}

// ─── Example chips ────────────────────────────────────────────────────────────

const EXAMPLES: Record<Key, Array<{ icon: string; cmd: string; label: string; hint: string }>> = {
  user_id: [
    { icon: '👤', cmd: 'user signed up',        label: 'User signed up',    hint: 'user_id key → same partition' },
    { icon: '🛒', cmd: 'user placed order',      label: 'Order placed',      hint: 'preserves user event order'  },
    { icon: '✏️', cmd: 'user updated profile',   label: 'Profile update',    hint: 'all user events in order'    },
    { icon: '🔐', cmd: 'user logged in',         label: 'Login event',       hint: 'same user → same partition'  },
  ],
  order_id: [
    { icon: '📝', cmd: 'order created',          label: 'Order created',     hint: 'order lifecycle start'       },
    { icon: '💳', cmd: 'payment processed',      label: 'Payment ok',        hint: 'order_id routes together'    },
    { icon: '🚚', cmd: 'order shipped',          label: 'Shipped',           hint: 'order events in order'       },
    { icon: '✅', cmd: 'order delivered',        label: 'Delivered',         hint: 'end of order lifecycle'      },
  ],
  random: [
    { icon: '📊', cmd: 'analytics event',        label: 'Analytics',         hint: 'random → max throughput'     },
    { icon: '🖱️', cmd: 'click event',            label: 'Click event',       hint: 'no ordering needed'          },
    { icon: '📄', cmd: 'page view',              label: 'Page view',         hint: 'distributes evenly'          },
    { icon: '📡', cmd: 'system metric',          label: 'System metric',     hint: 'high-volume telemetry'       },
  ],
};

// ─── Main component ────────────────────────────────────────────────────────────

export function KafkaPlayground() {
  const [partitionKey, setPartitionKey] = useState<Key>('user_id');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [offsets, setOffsets] = useState([0, 0, 0]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({ total: 4, current: -1, label: 'Pick an example or produce a message' });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();

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

  async function slowLine(tag: string, tagColor: string, message: string, ms = 380) {
    setLines((prev) => [...prev, { id: lid(), tag, tagColor, message, timestamp: ts() }]);
    await sleep(ms);
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

  async function handleSend(override?: string) {
    if (busy) return;
    const msg = override ?? (input.trim() || `event-${rand(100, 999)}`);
    setInput('');

    // Clear previous run
    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 4, current: -1, label: 'Pick an example or produce a message' });
    setScoreMsg(null);

    setBusy(true);

    let key: string;
    if (partitionKey === 'user_id') key = `user_${rand(1, 5)}`;
    else if (partitionKey === 'order_id') key = `order_${rand(1000, 1004)}`;
    else key = String(rand(0, 1000000));

    const partition = hashPartition(key, 3);

    // Capture current offset before state update
    let currentOffset = 0;
    setOffsets((prev) => { currentOffset = prev[partition] ?? 0; return prev; });
    await sleep(10); // let state settle

    // ── Phase 1: Producer ─────────────────────────────────────────────────────
    setStep(0, `Phase 1: Producer sends message with key="${key}"`);
    pulseGlow('producer');
    await slowLine('PROD', COLOR, `produce  key="${key}"  value="${msg}"`, 380);
    await slowLine('WHY', 'var(--muted)', `↳ WHY: The key determines routing — same key always lands on the same partition`, 360);
    if (partitionKey === 'random') {
      await slowLine('WHY', 'var(--muted)', `↳ Random key: Kafka round-robins → maximum throughput, but ordering is lost`, 360);
    }

    // ── Phase 2: Partition routing ────────────────────────────────────────────
    setStep(1, `Phase 2: hash("${key}") % 3 = partition-${partition}`);
    await flyPkt(17, 43, 50, `key:${key.slice(0, 10)}`, COLOR, '#000', 500);
    pulseGlow('broker');
    await slowLine('HASH', '#a78bfa', `hash("${key}") % 3  =  partition-${partition}`, 440);
    await slowLine('WHY', 'var(--muted)', `↳ WHY: Consistent hashing guarantees all events with key="${key}" always go to partition-${partition}`, 380);
    if (partitionKey === 'user_id') {
      await slowLine('IMP', COLOR, `↳ IMPACT: Consumer-${partition} will process ALL events for ${key} in strict order`, 400);
    } else if (partitionKey === 'random') {
      await slowLine('IMP', '#f87171', `↳ IMPACT: Random key → no ordering guarantee. Two events from the same source may land on different partitions`, 420);
    }

    // ── Phase 3: Log append ───────────────────────────────────────────────────
    setStep(2, `Phase 3: Appending to partition-${partition} at offset ${currentOffset}`);
    await slowLine(`P${partition}`, COLOR, `partition-${partition}  append at offset=${currentOffset}  value="${msg}"`, 440);
    await slowLine('WHY', 'var(--muted)', `↳ WHY: Kafka's partition is an immutable append-only log — it never overwrites, only appends`, 360);
    await slowLine('IMP', '#34d399', `↳ IMPACT: This message is now durable. Retained for 7 days — any consumer can replay from offset ${currentOffset}`, 400);

    setOffsets((prev) => {
      const next = [...prev];
      next[partition] = (next[partition] ?? 0) + 1;
      return next;
    });

    // ── Phase 4: Consumer reads ───────────────────────────────────────────────
    setStep(3, `Phase 4: Consumer-${partition} reads from partition-${partition}`);
    await sleep(150);
    await flyPkt(57, 78, 50, `off:${currentOffset}`, COLOR, '#000', 500);
    pulseGlow('consumer');
    await slowLine('CONS', 'var(--c-api)', `consumer-group-1  partition-${partition}  offset=${currentOffset}  msg="${msg}"`, 440);
    await slowLine('ACK', 'var(--muted)', `committed offset=${currentOffset + 1} on partition-${partition}`, 360);
    await slowLine('WHY', 'var(--muted)', `↳ WHY: Committing the offset tells Kafka "I've processed up to here" — crash-safe progress tracking`, 400);

    // ── Summary ───────────────────────────────────────────────────────────────
    await slowLine('───', 'var(--line)', '─────────────── Summary ───────────────', 180);
    await slowLine('SUM', COLOR, `key="${key}"  →  partition-${partition}  →  offset ${currentOffset}  →  consumer-${partition}`, 380);
    if (partitionKey === 'user_id') {
      await slowLine('INS', '#fbbf24', `↳ Send another "${key}" event — it will always land on partition-${partition} (ordering guaranteed)`, 400);
    } else if (partitionKey === 'random') {
      await slowLine('INS', '#fbbf24', `↳ Try key=user_id mode to see how related events stay together in one partition`, 400);
    } else {
      await slowLine('INS', '#fbbf24', `↳ All events in the same order lifecycle land on the same partition — consistent state per order`, 400);
    }

    showScore(`partition-${partition} · offset:${currentOffset} · key:${key}`);
    setBusy(false);
  }

  function resetState(m: string) {
    setPartitionKey(m as Key);
    setLines([]);
    setOffsets([0, 0, 0]);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 4, current: -1, label: 'Pick an example or produce a message' });
    setScoreMsg(null);
    setLogsExpanded(false);
  }

  const examples = EXAMPLES[partitionKey];

  return (
    <div className="flex flex-col">
      <ScoreToast message={scoreMsg} accentColor={COLOR} />

      <div className="p-6 flex flex-col gap-3">
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-xs font-mono text-[var(--muted)]">
              topic: orders — 3 partitions · key={partitionKey}
            </span>
            {busy && (
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${COLOR} 15%, transparent)`, color: COLOR }}>
                producing...
              </span>
            )}
          </div>

          {/* Animated node strip */}
          <div className="relative bg-[var(--bg)] flex-shrink-0" style={{ height: 110 }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.3,
              }}
            />
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <line x1="17%" y1="50%" x2="43%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="57%" y1="50%" x2="78%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
            </svg>

            {[
              { id: 'producer', icon: '📤', title: 'Producer',      sub: 'your app',         xPct: 10 },
              { id: 'broker',   icon: '📦', title: 'Kafka Broker',  sub: '3 partitions',     xPct: 50 },
              { id: 'consumer', icon: '📥', title: 'Consumer Grp',  sub: 'notification-svc', xPct: 88 },
            ].map((node) => (
              <div
                key={node.id}
                className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                style={{
                  left: `${node.xPct}%`, top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 80, height: 68,
                  background: 'var(--bg2)',
                  borderColor: glows.has(node.id) ? COLOR : 'var(--line2)',
                  boxShadow: glows.has(node.id) ? `0 0 0 4px color-mix(in srgb, ${COLOR} 22%, transparent)` : undefined,
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
                  background: pkt.color, color: pkt.textColor,
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

          {/* Partition offset grid */}
          <div className="grid grid-cols-3 gap-3 px-4 pt-3 pb-1 flex-shrink-0">
            {offsets.map((offset, i) => (
              <div key={i} className="bg-[var(--bg2)] border border-[var(--line2)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-semibold" style={{ color: COLOR }}>
                    partition-{i}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--muted)]">offset: {offset}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: Math.min(offset, 8) }).map((_, j) => (
                    <div
                      key={j}
                      className="w-4 h-4 rounded text-[8px] flex items-center justify-center font-mono"
                      style={{ background: `color-mix(in srgb, ${COLOR} 15%, transparent)`, color: COLOR }}
                    >
                      {j}
                    </div>
                  ))}
                  {offset > 8 && <span className="text-[9px] text-[var(--muted)] self-center">+{offset - 8}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Terminal */}
          {lines.length === 0 && !busy ? (
            <div className="mx-4 my-3">
              {beginnerMode ? (
                <PlaygroundHint
                  action="Click the 'user_id=order_123' chip below and hit Send"
                  expect="Watch the message key get hashed, routed to a specific partition, and assigned an immutable offset — all in order"
                  accentColor={COLOR}
                />
              ) : (
                <div className="h-32 rounded-lg border border-[var(--line)] flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl opacity-30">📨</span>
                  <span className="text-xs text-[var(--muted)]">Pick an example below to produce a message</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative mx-4 my-3">
              <Terminal lines={lines} className="max-h-52 border-[var(--line)]" />
              <button
                type="button"
                onClick={() => setLogsExpanded(true)}
                title="Expand logs"
                className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono"
                style={{
                  background: `color-mix(in srgb, ${COLOR} 12%, var(--bg1))`,
                  color: COLOR,
                  border: `1px solid color-mix(in srgb, ${COLOR} 25%, var(--line))`,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 4V1h3M9 4V1H6M1 6v3h3M9 6v3H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                expand
              </button>
            </div>
          )}

          {/* Log overlay */}
          {logsExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              onClick={() => setLogsExpanded(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
                style={{ background: 'var(--bg)', borderColor: COLOR + '44' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-2 text-xs font-mono text-[var(--muted)]">simulation log</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-1"
                      style={{ background: `color-mix(in srgb, ${COLOR} 15%, transparent)`, color: COLOR }}>
                      {lines.length} lines
                    </span>
                  </div>
                  <button type="button" onClick={() => setLogsExpanded(false)}
                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-lg leading-none px-1">
                    ×
                  </button>
                </div>
                <div className="overflow-y-auto p-5 space-y-1.5 flex-1">
                  {lines.map((line) => (
                    <div key={line.id} className="flex items-start gap-3">
                      <span className="text-[11px] font-mono text-[var(--dim)] flex-shrink-0 mt-px w-14 text-right">{line.timestamp}</span>
                      <span className="text-[11px] font-mono px-2 py-px rounded font-semibold flex-shrink-0 mt-px"
                        style={{ color: line.tagColor, background: `color-mix(in srgb, ${line.tagColor} 12%, transparent)`, minWidth: 36, textAlign: 'center' as const }}>
                        {line.tag}
                      </span>
                      <span className="text-[13px] text-[var(--text2)] leading-relaxed flex-1 break-words">{line.message}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-2.5 border-t flex-shrink-0 text-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}>
                  <span className="text-[10px] text-[var(--muted)] font-mono">click outside or × to close</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What happened? — beginner mode summary */}
        <WhatHappenedPanel
          lines={lines}
          accentColor={COLOR}
          visible={!busy && lines.length > 0 && beginnerMode}
        />

        {/* Example chips */}
        <div className="flex-shrink-0">
          <p className="text-[10px] font-mono text-[var(--muted)] mb-2 px-0.5">
            {busy ? 'Watch the simulation above ↑' : `Produce a message with key=${partitionKey}:`}
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
                  background: busy ? 'var(--bg1)' : `color-mix(in srgb, ${COLOR} 4%, var(--bg1))`,
                  borderColor: busy ? 'var(--line)' : `color-mix(in srgb, ${COLOR} 20%, var(--line))`,
                  opacity: busy ? 0.45 : 1,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {!busy && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `color-mix(in srgb, ${COLOR} 6%, transparent)` }} />
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{ex.icon}</span>
                  <span className="text-[10px] font-semibold text-[var(--text)] leading-tight">{ex.label}</span>
                </div>
                <code className="text-[9px] font-mono leading-tight truncate block" style={{ color: busy ? 'var(--muted)' : COLOR }}>
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
        modes={[
          { id: 'user_id',   label: 'key=user_id'   },
          { id: 'order_id',  label: 'key=order_id'  },
          { id: 'random',    label: 'key=random'    },
        ]}
        activeMode={partitionKey}
        onModeChange={resetState}
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        placeholder={`Or type your own message with ${partitionKey} routing…`}
        disabled={busy}
        accentColor={COLOR}
      />
      </div>
    </div>
  );
}
