'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, type LogLine } from '@/components/visualizer/shared/Terminal';
import { StepBar } from '@/components/visualizer/shared/StepBar';
import { ScoreToast } from '@/components/visualizer/shared/ScoreToast';
import { cn, sleep, rand, ts } from '@/lib/utils';
import { SimDisclaimer } from '@/components/visualizer/shared/SimDisclaimer';
import { WhatHappenedPanel } from '@/components/visualizer/shared/WhatHappenedPanel';
import { PlaygroundHint } from '@/components/visualizer/shared/PlaygroundHint';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

const COLOR = 'var(--c-cache)';
type Mode = 'ttl' | 'lru' | 'write';

interface CacheEntry {
  key: string;
  value: string;
  ttl: number;
  insertedAt: number;
  lastUsed: number;
}

let _id = 0;
const lid = () => String(++_id);

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

const SAMPLE_VALUES: Record<string, string> = {
  'user:1':    '{"id":1,"name":"Alice"}',
  'user:2':    '{"id":2,"name":"Bob"}',
  'session:x': '{"userId":1,"role":"admin"}',
  'product:5': '{"sku":"PRD-5","price":29.99}',
  'config':    '{"theme":"dark","lang":"en"}',
  'rate:ip1':  '42',
  'feed:home': '[1,2,3,4,5]',
  'geo:nyc':   '{"lat":40.7,"lng":-74.0}',
};

const EXAMPLES: Record<Mode, { icon: string; label: string; key: string; hint: string; isWrite?: boolean }[]> = {
  ttl: [
    { icon: '👤', label: 'User profile',  key: 'user:1',    hint: 'Miss → cached → hit the 2nd time. Watch TTL tick.' },
    { icon: '🔐', label: 'Session data',  key: 'session:x', hint: 'Sessions expire after TTL — forces re-auth' },
    { icon: '📦', label: 'Product info',  key: 'product:5', hint: 'Price data — short TTL keeps it fresh' },
    { icon: '⚙️', label: 'Config flags',  key: 'config',    hint: 'Rarely changes — long TTL is fine' },
  ],
  lru: [
    { icon: '🔥', label: 'Hot user',      key: 'user:1',    hint: 'Frequently accessed — survives LRU eviction' },
    { icon: '📰', label: 'Home feed',     key: 'feed:home', hint: 'Fill cache to 8 then see LRU evict oldest' },
    { icon: '🌍', label: 'Geo lookup',    key: 'geo:nyc',   hint: 'Rarely used — first to be evicted' },
    { icon: '📊', label: 'Rate limit',    key: 'rate:ip1',  hint: 'Short-lived counters — typical LRU candidate' },
  ],
  write: [
    { icon: '✏️', label: 'Update user',   key: 'user:2',    hint: 'Write-through: cache + DB updated atomically', isWrite: true },
    { icon: '📖', label: 'Read user',     key: 'user:1',    hint: 'GET after SET — always hits cache immediately' },
    { icon: '💰', label: 'Price update',  key: 'product:5', hint: 'Financial data — write-through prevents stale price', isWrite: true },
    { icon: '🔄', label: 'Config reload', key: 'config',    hint: 'Config write-through — instant propagation', isWrite: true },
  ],
};

export function CachePlayground() {
  const [mode, setMode] = useState<Mode>('ttl');
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({ total: 4, current: -1, label: 'Click an example — click the same key twice to see HIT vs MISS' });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TTL countdown ticker
  useEffect(() => {
    if (mode !== 'ttl') return;
    tickRef.current = setInterval(() => {
      setCache((prev) => {
        const next = new Map(prev);
        for (const [k, v] of next) {
          const remaining = v.ttl - 1;
          if (remaining <= 0) next.delete(k);
          else next.set(k, { ...v, ttl: remaining });
        }
        return next;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [mode]);

  function resetAll() {
    setCache(new Map());
    setLines([]);
    setBusy(false);
    setPackets([]);
    setGlows(new Set());
    setStepState({ total: 4, current: -1, label: 'Click an example — click the same key twice to see HIT vs MISS' });
    setScoreMsg(null);
  }

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

  async function slowLine(tag: string, tagColor: string, msg: string, ms = 380) {
    setLines((p) => [...p, { id: lid(), tag, tagColor, message: msg, timestamp: ts() }]);
    await sleep(ms);
  }

  async function handleExample(ex: typeof EXAMPLES['ttl'][0]) {
    if (busy) return;
    setBusy(true);

    const key = ex.key;
    const isWrite = ex.isWrite ?? false;

    if (!isWrite) {
      // GET / cache-aside path
      const hit = cache.get(key);

      setStep(0, `Checking Redis for "${key}"...`);
      pulseGlow('client');
      await slowLine('GET', COLOR, `GET ${key}`, 300);
      await flyPkt(17, 43, 45, `GET ${key}`, COLOR, '#000', 440);
      pulseGlow('redis');
      await sleep(rand(10, 25));

      if (hit) {
        setStep(1, `Cache HIT — served from RAM in ~1ms`);
        await slowLine('HIT', 'var(--c-api)', `← ${hit.value}  (~1ms — from Redis memory)`, 320);
        await slowLine('WHY', '#a78bfa', `WHY: key "${key}" is in Redis. DB not touched — saved ${rand(40, 100)}ms.`, 400);
        await flyPkt(43, 17, 45, `HIT ✓`, '#0a2019', 'var(--c-api)', 400);
        pulseGlow('client');
        setStep(3, '✓ DB not touched. 0 queries. Served from memory.');
        showScore(`Cache HIT · ~1ms · DB queries: 0`);

        if (mode === 'lru') {
          setCache((prev) => {
            const next = new Map(prev);
            const entry = next.get(key);
            if (entry) next.set(key, { ...entry, lastUsed: Date.now() });
            return next;
          });
        }
      } else {
        setStep(1, `Cache MISS — fetching from PostgreSQL...`);
        await slowLine('MSS', '#f87171', `cache miss — "${key}" not in Redis`, 320);
        await slowLine('WHY', '#a78bfa', `WHY: key not cached yet. Must pay the DB round-trip cost.`, 400);
        await flyPkt(43, 78, 50, 'MISS → DB', '#f87171', '#fff', 480);
        pulseGlow('db');

        const dbMs = rand(40, 110);
        await sleep(dbMs);
        const value = SAMPLE_VALUES[key] ?? `{"key":"${key}","val":${rand(1, 999)}}`;
        await slowLine('DB', 'var(--c-db)', `← ${value}  (${dbMs}ms — disk I/O)`, 320);

        // LRU eviction if full
        if (mode === 'lru' && cache.size >= 8) {
          let lruKey = '';
          let lruTime = Infinity;
          for (const [k, v] of cache) {
            if (v.lastUsed < lruTime) { lruTime = v.lastUsed; lruKey = k; }
          }
          setCache((prev) => { const next = new Map(prev); next.delete(lruKey); return next; });
          await slowLine('LRU', '#f59e0b', `evicted "${lruKey}" (least recently used — ${Math.round((Date.now() - lruTime) / 1000)}s ago)`, 360);
        }

        const ttl = mode === 'ttl' ? rand(20, 90) : 999999;
        const now = Date.now();
        setCache((prev) => new Map(prev).set(key, { key, value, ttl, insertedAt: now, lastUsed: now }));
        await slowLine('SET', COLOR, `cached "${key}"${mode === 'ttl' ? `  TTL=${ttl}s` : '  (no expiry)'}`, 320);
        await slowLine('IMP', '#f59e0b', `IMP: next GET "${key}" → ~1ms. Saved ${dbMs}ms. Click same chip again to see HIT.`, 420);

        await flyPkt(78, 43, 50, 'rows', '#0a1428', 'var(--c-db)', 380);
        await flyPkt(43, 17, 45, key, COLOR, '#000', 380);
        pulseGlow('client');

        setStep(3, `MISS → cached for ${mode === 'ttl' ? ttl + 's' : '∞'}. Click same chip → HIT.`);
        showScore(`Cache MISS · DB: ${dbMs}ms · cached${mode === 'ttl' ? ` for ${ttl}s` : ''}`);
      }
    } else {
      // WRITE-THROUGH path
      const value = SAMPLE_VALUES[key] ?? `{"key":"${key}","updated":${rand(1, 999)}}`;

      setStep(0, 'Write-through: updating cache AND DB together...');
      pulseGlow('client');
      await slowLine('SET', COLOR, `SET ${key} = ${value}`, 300);
      await slowLine('WHY', '#a78bfa', `WHY: write-through updates cache + DB atomically. No staleness window.`, 420);

      await flyPkt(17, 43, 45, `SET ${key}`, COLOR, '#000', 440);
      pulseGlow('redis');
      await sleep(10);
      const now = Date.now();
      setCache((prev) => new Map(prev).set(key, { key, value, ttl: 999999, insertedAt: now, lastUsed: now }));
      await slowLine('WRT', COLOR, `→ Redis: SET "${key}" OK`, 300);

      setStep(1, 'Simultaneously writing to PostgreSQL...');
      await flyPkt(43, 78, 55, 'WRITE → DB', 'var(--c-db)', '#000', 480);
      pulseGlow('db');
      const dbMs = rand(30, 80);
      await sleep(dbMs);
      await slowLine('WRT', 'var(--c-db)', `→ DB: UPDATE users SET ... OK  (${dbMs}ms)`, 300);
      await slowLine('OK', 'var(--c-api)', `both cache & DB updated (${dbMs}ms) — no stale reads possible`, 360);
      await slowLine('IMP', '#f59e0b', `IMP: vs write-back — if server crashes now, data is safe in DB.`, 400);
      pulseGlow('client');

      setStep(2, '✓ Cache + DB in sync. Zero staleness window.');
      showScore(`Write-through · ${dbMs}ms · cache & DB consistent`);
    }

    setBusy(false);
  }

  const cacheEntries = Array.from(cache.entries());
  const examples = EXAMPLES[mode];

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
              <span className="text-xs font-mono" style={{ color: COLOR }}>cache log — {mode}</span>
              <button type="button" onClick={() => setLogsExpanded(false)}
                className="text-xs font-mono px-2 py-0.5 rounded border"
                style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}>
                × close
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-1.5" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {lines.length === 0 ? (
                <p className="text-[12px] text-[var(--muted)] font-mono">No logs yet.</p>
              ) : lines.map((l) => (
                <div key={l.id} className="flex items-start gap-3 font-mono text-[13px] leading-relaxed">
                  <span className="text-[10px] text-[var(--muted)] flex-shrink-0 mt-0.5">{l.timestamp}</span>
                  <span className="text-[10px] font-bold flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                    style={{ color: l.tagColor, background: `color-mix(in srgb, ${l.tagColor} 12%, transparent)` }}>
                    {l.tag}
                  </span>
                  <span className="text-[var(--text2)]">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 flex flex-col gap-3 overflow-hidden">
        {/* Example chips */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          {examples.map((ex) => (
            <button
              key={ex.key + (ex.isWrite ? '-w' : '-r')}
              type="button"
              disabled={busy}
              onClick={() => handleExample(ex)}
              className="flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all"
              style={{
                background: 'var(--bg2)',
                borderColor: ex.isWrite ? `color-mix(in srgb, var(--c-db) 30%, var(--line))` : 'var(--line)',
                opacity: busy ? 0.4 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{ex.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text)] mb-0.5">{ex.label}</p>
                <p className="text-[10px] font-mono truncate" style={{ color: ex.isWrite ? 'var(--c-db)' : COLOR }}>
                  {ex.isWrite ? 'SET' : 'GET'} {ex.key}
                </p>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">{ex.hint}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Visualizer card */}
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Chrome bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-1 text-xs font-mono text-[var(--muted)]">
                Redis — {cacheEntries.length}/8 slots used
              </span>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--text2)] px-2 py-1 rounded border border-[var(--line2)] hover:border-[var(--muted)] transition-colors"
            >
              flush cache
            </button>
          </div>

          {/* Animated node strip */}
          <div className="relative bg-[var(--bg)] flex-shrink-0" style={{ height: 100 }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
              backgroundSize: '40px 40px', opacity: 0.3,
            }} />
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <line x1="17%" y1="50%" x2="43%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              <line x1="57%" y1="50%" x2="78%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
            </svg>

            {[
              { id: 'client', icon: '💻', title: 'You',         sub: 'requesting',      xPct: 10 },
              { id: 'redis',  icon: '⚡', title: 'Redis',        sub: 'in-memory ~1ms',  xPct: 50 },
              { id: 'db',     icon: '🗄️', title: 'PostgreSQL',   sub: 'source of truth', xPct: 88 },
            ].map((node) => (
              <div key={node.id} className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                style={{
                  left: `${node.xPct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                  width: 78, height: 66, background: 'var(--bg2)',
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
              <div key={pkt.id} className="absolute pointer-events-none z-20 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap"
                style={{
                  left: pkt.active ? `${pkt.toXPct}%` : `${pkt.fromXPct}%`,
                  top: `${pkt.yPct}%`, transform: 'translateY(-50%)',
                  background: pkt.color, color: pkt.textColor, padding: '2px 9px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: pkt.active ? `left ${pkt.dur}ms cubic-bezier(.4,0,.2,1)` : undefined,
                  opacity: pkt.active ? 1 : 0,
                }}
              >
                {pkt.label}
              </div>
            ))}
          </div>

          <StepBar total={step.total} current={step.current} label={step.label} accentColor={COLOR} />

          {/* Cache slot grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-4 gap-2">
              {cacheEntries.map(([k, v]) => (
                <div key={k}
                  className="rounded-lg border p-2.5 text-[10px] font-mono"
                  style={{ borderColor: `color-mix(in srgb, ${COLOR} 40%, transparent)`, background: 'var(--bg2)' }}
                >
                  <p className="font-semibold truncate" style={{ color: COLOR }}>{k}</p>
                  <p className="text-[var(--text2)] truncate mt-0.5">{v.value.slice(0, 16)}…</p>
                  {mode === 'ttl' && (
                    <p className={cn('mt-1 font-semibold', v.ttl < 10 ? 'text-red-400' : 'text-[var(--muted)]')}>
                      TTL: {v.ttl}s
                    </p>
                  )}
                  {mode === 'lru' && (
                    <p className="mt-1 text-[var(--muted)]">
                      {Math.round((Date.now() - v.lastUsed) / 1000)}s ago
                    </p>
                  )}
                  {mode === 'write' && (
                    <p className="mt-1 text-[var(--muted)]">write-through</p>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 8 - cacheEntries.length) }).map((_, i) => (
                <div key={`empty-${i}`}
                  className="rounded-lg border border-dashed border-[var(--line)] p-2.5 flex items-center justify-center"
                >
                  <span className="text-[10px] font-mono text-[var(--dim)]">empty</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Log terminal */}
          <div className="relative mx-4 mb-4 mt-1">
            {lines.length > 0 && (
              <button type="button" onClick={() => setLogsExpanded(true)}
                className="absolute top-2 right-2 z-10 text-[9px] font-mono px-2 py-0.5 rounded border"
                style={{ color: COLOR, borderColor: `color-mix(in srgb, ${COLOR} 30%, transparent)`, background: 'var(--bg2)' }}
              >
                ⤢ expand
              </button>
            )}
            {lines.length === 0 && !busy ? (
              beginnerMode ? (
                <PlaygroundHint
                  action={mode === 'write'
                    ? "Click any chip above to update a value"
                    : "Click any chip above, then click the same chip again"}
                  expect={mode === 'write'
                    ? "See write-through: the cache and database both update atomically — no stale data window"
                    : "First click = cache miss (slow DB round-trip); second click = instant cache hit — that's the speedup caching gives you"}
                  accentColor={COLOR}
                />
              ) : (
                <div className="h-32 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                  <p className="text-[11px] text-[var(--muted)] font-mono">Click a chip — then click the same chip again to see HIT</p>
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

      {/* Mode switcher */}
      <div className="flex gap-1.5 px-4 pb-3 bg-[var(--bg1)] border-t border-[var(--line)] pt-2 flex-shrink-0">
        <span className="text-[10px] font-mono text-[var(--muted)] self-center mr-1">strategy:</span>
        {(['ttl', 'lru', 'write'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); resetAll(); }}
            className={cn(
              'text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all',
              mode === m ? 'font-semibold' : 'border-[var(--line2)] text-[var(--muted)]',
            )}
            style={mode === m ? {
              color: COLOR,
              borderColor: COLOR,
              backgroundColor: `color-mix(in srgb, ${COLOR} 10%, transparent)`,
            } : undefined}
          >
            {m === 'ttl' ? 'TTL expiry' : m === 'lru' ? 'LRU eviction' : 'Write-through'}
          </button>
        ))}
      </div>
    </div>
  );
}
