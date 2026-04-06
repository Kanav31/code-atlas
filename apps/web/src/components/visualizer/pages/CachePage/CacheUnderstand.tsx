'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { ComparisonGrid } from '@/components/visualizer/shared/ComparisonGrid';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-cache)';

// ─── Concept gate ─────────────────────────────────────────────────────────────

const CACHE_CONCEPTS = [
  {
    term: 'Cache',
    plain: 'A fast temporary store (usually in RAM) that holds copies of frequently read data so you skip the slower database.',
    analogy: 'A sticky note on your desk — instead of walking to the filing cabinet every time, you check the note first.',
  },
  {
    term: 'Cache hit',
    plain: 'When the data you need is already in the cache. The request returns in ~1ms without touching the database.',
    analogy: 'The sticky note has the answer — no filing cabinet trip needed.',
  },
  {
    term: 'Cache miss',
    plain: 'When the data isn\'t in the cache yet. You must go to the database (~50ms), then store the result for next time.',
    analogy: 'The sticky note is blank — you walk to the filing cabinet, read it, then write the answer on the note.',
  },
];

// ─── Tour data ────────────────────────────────────────────────────────────────

interface TourStep {
  num: number;
  title: string;
  color: string;
  headline: string;
  diagram: string;
  insight: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    num: 1,
    title: 'Cache miss — the slow path',
    color: '#f87171',
    headline: 'First request: cache is empty, must go all the way to the database',
    diagram: `Client  →  Redis Cache  →  PostgreSQL
  │              │                │
  │  GET user:1  │                │
  │─────────────►│                │
  │              │  MISS (empty)  │
  │              │───────────────►│
  │              │                │  SELECT * FROM users
  │              │                │  WHERE id = 1
  │              │◄───────────────│  (50ms — disk I/O)
  │              │
  │              │  SET user:1 = {...}  TTL=60s
  │              │  (cached for next time)
  │◄─────────────│
  │  {"id":1, "name":"Alice"}  (50ms total)`,
    insight:
      'The first request for any key is always slow — it must hit the database. But the cache stores the result. Every subsequent request for the same key skips the DB entirely. This is cache-aside (lazy loading): populate on miss, serve on hit.',
  },
  {
    num: 2,
    title: 'Cache hit — the fast path',
    color: '#34d399',
    headline: 'Second request for the same key: Redis answers in ~1ms, DB untouched',
    diagram: `Client  →  Redis Cache  →  PostgreSQL
  │              │                │
  │  GET user:1  │                │
  │─────────────►│                │
  │              │  HIT ✓         │
  │              │  (found in RAM) │   ← DB not touched
  │◄─────────────│                │
  │  {"id":1, "name":"Alice"}     │
  │  (1ms — from memory)          │

  Hit rate math:
  ┌─────────────────────────────────────┐
  │  1000 req/s  ·  95% hit rate        │
  │  950 → cache  ~1ms                  │
  │   50 → DB    ~50ms                  │
  │  avg latency = 0.95×1 + 0.05×50    │
  │             = 3.45ms  (vs 50ms)     │
  └─────────────────────────────────────┘`,
    insight:
      'A 95% cache hit rate reduces average latency from 50ms to 3.45ms — a 14× speedup. It also reduces DB load by 95%. The goal is maximizing hit rate: choose keys with high access frequency relative to their update rate.',
  },
  {
    num: 3,
    title: 'TTL expiry — freshness control',
    color: '#f59e0b',
    headline: 'TTL (Time-to-Live) controls how stale cached data can get before forcing a refresh',
    diagram: `SET user:1 = {...}  EX 60   ← expires in 60 seconds

  t=0s   cached → fast for all requests
  t=30s  still fresh → fast
  t=59s  1 second left → almost expired
  t=60s  EXPIRED → next request = cache MISS
             │
             └► DB query → fresh data cached again

  TTL tradeoffs:
  Short TTL (5s)  → fresh data, more DB hits
  Long TTL (1h)   → fewer DB hits, staler data
  No TTL          → must manually invalidate on update

  Good defaults:
  User profiles    → TTL 5min (changes rarely)
  Product prices   → TTL 30s  (must be fresh)
  Config / flags   → TTL 1min (almost never changes)
  Sessions         → TTL = session lifetime`,
    insight:
      'TTL is your freshness SLA. Set it based on how often the underlying data changes and how stale is acceptable. A product price cached for 1 hour during a flash sale is a business bug, not just a tech bug.',
  },
  {
    num: 4,
    title: 'LRU eviction — memory management',
    color: '#a78bfa',
    headline: 'When the cache is full, LRU removes the entry that was least recently accessed',
    diagram: `Cache capacity: 4 slots  (max memory reached)

  Current state:
  ┌─────────┬─────────┬─────────┬─────────┐
  │ user:1  │ user:2  │ user:3  │ user:4  │
  │ 30s ago │  1s ago │  5s ago │ 90s ago │ ← lastUsed
  └─────────┴─────────┴─────────┴─────────┘

  GET user:5 → cache MISS → need to evict one

  LRU picks: user:4 (last used 90 seconds ago)

  ┌─────────┬─────────┬─────────┬─────────┐
  │ user:1  │ user:2  │ user:3  │ user:5  │  ← new entry
  │ 30s ago │  1s ago │  5s ago │  0s ago │
  └─────────┴─────────┴─────────┴─────────┘

  Assumption: recently used = likely to be used again`,
    insight:
      'LRU exploits temporal locality — if you accessed something recently, you\'ll likely access it again soon. Redis implements LRU with a pool-based approximation (samples N keys, evicts the oldest) to avoid the cost of a perfect doubly-linked list at scale.',
  },
];

// ─── Guided tour ──────────────────────────────────────────────────────────────

function GuidedTour() {
  const { beginnerMode } = useBeginnerModeContext();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (beginnerMode) setPlaying(false);
  }, [beginnerMode]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TOUR_STEPS.length), 3400);
    return () => clearInterval(t);
  }, [playing]);

  const step = TOUR_STEPS[idx]!;

  function goTo(i: number) { setIdx(i); setPlaying(false); }
  function goPrev() { goTo((idx - 1 + TOUR_STEPS.length) % TOUR_STEPS.length); }
  function goNext() { goTo((idx + 1) % TOUR_STEPS.length); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLOR }}>
            Cache lifecycle · {beginnerMode ? 'step-by-step' : 'auto-play'}
          </span>
          <h2 className="text-sm font-semibold text-[var(--text)] mt-0.5">
            Phase {step.num}/4 — {step.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to phase ${i + 1}`}
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
          Phase {step.num}
        </span>
        <p className="text-[11px] font-semibold text-[var(--text)] leading-snug">{step.headline}</p>
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

      {beginnerMode && (
        <div className="mt-3">
          <Callout type="tip" title="What this means:">
            {step.insight}
          </Callout>
        </div>
      )}

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

export function CacheUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_cache_understand');

  if (beginnerMode && mounted && isFirstVisit) {
    return (
      <div className="px-8 py-6 content-zone">
        <ConceptGate concepts={CACHE_CONCEPTS} accentColor={COLOR} onReady={markSeen} />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {beginnerMode && mounted && (
        <KeyTermsAccordion concepts={CACHE_CONCEPTS} accentColor={COLOR} />
      )}
      <GuidedTour />

      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">A cache is a sticky note on your desk.</strong>{' '}
        Instead of walking to the filing cabinet (database) every time, you write the answer on a sticky note.
        TTL is the expiry date you write on the note — after that you must check the cabinet again.
        LRU means when your desk is full, you throw away the note you haven&apos;t looked at the longest.
        Write-through means every time you update the filing cabinet, you update the sticky note too — no stale notes.
      </ELI5Card>

      <ComparisonGrid
        columns={[
          {
            title: 'TTL Cache',
            accent: COLOR,
            badge: { label: 'time-based', color: COLOR },
            items: [
              'Each entry expires after N seconds',
              'Simple — no access tracking needed',
              'Stale data possible just before expiry',
              'Good for: config, feature flags, sessions',
              'Set TTL based on data freshness needs',
            ],
          },
          {
            title: 'LRU Cache',
            accent: '#f59e0b',
            badge: { label: 'usage-based', color: '#f59e0b' },
            items: [
              'Evicts the least recently used entry',
              'Adapts to actual access patterns',
              'Requires tracking last-access time',
              'Good for: user sessions, hot data sets',
              'Cache size is the only limit',
            ],
          },
          {
            title: 'Write-through',
            accent: 'var(--c-db)',
            badge: { label: 'write strategy', color: 'var(--c-db)' },
            items: [
              'Every write updates cache AND DB',
              'Cache never holds stale data',
              'Higher write latency (two writes)',
              'No data loss on cache crash',
              'Good for: financial data, inventory',
            ],
          },
        ]}
      />

      {/* Core concepts */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Core concepts</h2>
        <div className="space-y-2">
          {[
            { term: 'Cache-aside',    def: 'App checks cache → miss → query DB → store in cache → return. Most common pattern. App controls what gets cached. Also called lazy loading.' },
            { term: 'TTL',           def: 'Time-to-Live. How long a cached entry is valid. Redis SET key value EX 60 expires in 60s. Short TTL = fresh data, more DB hits. Long TTL = fewer DB hits, staler data.' },
            { term: 'LRU eviction',  def: 'When cache is full, removes the Least Recently Used entry. Redis approximates LRU by sampling N random keys and evicting the oldest. maxmemory-policy = allkeys-lru.' },
            { term: 'Write-through', def: 'Writes go to cache AND DB synchronously. No staleness window. Higher write latency. If DB write fails, roll back the cache write.' },
            { term: 'Write-back',    def: 'Write to cache only, flush to DB asynchronously. Fastest writes. Risk: cache crash before flush = data loss. Use only when write loss is acceptable.' },
            { term: 'Cache stampede',def: 'Popular cached key expires → hundreds of requests simultaneously miss → all hit DB at once. Fix: mutex lock (SETNX), probabilistic early expiration, or stale-while-revalidate.' },
          ].map((row) => (
            <div
              key={row.term}
              className="flex gap-4 rounded-lg border px-4 py-3"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <span className="text-[11px] font-mono font-semibold w-28 flex-shrink-0 mt-px" style={{ color: COLOR }}>
                {row.term}
              </span>
              <span className="text-[11px] text-[var(--text2)] leading-relaxed">{row.def}</span>
            </div>
          ))}
        </div>
      </div>

      <Callout type="tip" title="Cache-aside is the right default:">
        Redis + PostgreSQL with cache-aside handles 90% of use cases. Check cache → miss → query DB → cache it → return.
        The application stays in control of what gets cached and for how long.
        Only reach for write-through or write-back when you have a specific consistency or write-performance requirement.
      </Callout>
    </div>
  );
}
