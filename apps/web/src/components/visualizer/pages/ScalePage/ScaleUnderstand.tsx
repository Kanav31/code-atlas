'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { Term } from '@/components/visualizer/shared/Term';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-scale)';

// ─── Concept gate ─────────────────────────────────────────────────────────────

const SCALE_CONCEPTS = [
  {
    term: 'Horizontal scaling',
    plain: 'Adding more servers (instead of making one server bigger). All servers share the incoming traffic.',
    analogy: 'Hiring more cashiers at a grocery store instead of training one cashier to move infinitely fast.',
  },
  {
    term: 'Load balancer',
    plain: 'A traffic cop that sits in front of your servers and decides which server handles each incoming request.',
    analogy: 'A maître d\' seating customers at the restaurant table with the shortest wait — not always table #1.',
  },
  {
    term: 'Stateless server',
    plain: 'A server that remembers nothing between requests. All user data lives in a shared database or cache.',
    analogy: 'A vending machine — it doesn\'t know you from the last time. Any machine gives you the same Coke.',
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
    title: 'Vertical vs horizontal scaling',
    color: '#f87171',
    headline: 'Scale up hits a hardware ceiling; scale out is theoretically unlimited',
    diagram: `Vertical scaling (scale up)         Horizontal scaling (scale out)

  Server ████████████ 32-core          Server-1 ████ 4-core
  Server ████████████ 64-core  →       Server-2 ████ 4-core
  Server ████████████ 128-core         Server-3 ████ 4-core
         ↑                                      ↑
  hardware ceiling ~$50K/mo            add more as needed
  single point of failure              no single point of failure
  downtime to upgrade                  add/remove without downtime

  Rule: vertical until CPU > 70% peak → then horizontal`,
    insight:
      'Vertical scaling is fast to implement (just upgrade the instance) but hits hard limits and creates a single point of failure. Horizontal scaling requires a load balancer and stateless services — but you can add capacity in minutes without downtime.',
  },
  {
    num: 2,
    title: 'Load balancer — request distribution',
    color: '#fb923c',
    headline: 'The load balancer is the traffic cop — it decides which server handles each request',
    diagram: `           Client requests
                   │
           ┌───────▼────────┐
           │  Load Balancer  │
           │  algorithm:     │
           │  least-conn     │
           └──┬──────┬───┬──┘
              │      │   │
         ┌────▼─┐ ┌──▼──┐ ┌▼────┐
         │ srv1 │ │ srv2 │ │ srv3│
         │  3   │ │  1   │ │  5  │ ← active connections
         └──────┘ └──────┘ └─────┘

  Next request → srv2 (fewest connections)

  Algorithms:
  Round-robin   → distribute evenly, ignores load
  Least-conn    → route to least busy server
  IP hash       → same client → same server (sticky)
  Weighted      → srv1 gets 2× traffic of srv2`,
    insight:
      'Least-connections is the safest default — it adapts to uneven request durations (a slow DB query keeps a connection open longer). IP hash is needed for stateful sessions if you can\'t use a shared session store.',
  },
  {
    num: 3,
    title: 'Read replicas — separate reads from writes',
    color: '#a78bfa',
    headline: 'Reads go to replicas; writes always go to primary — primary handles far less load',
    diagram: `           Application
               │
        ┌──────┴───────┐
        │   Read/Write  │
        │    Router     │
        └──┬────────┬──┘
           │        │
    WRITE  │        │ READ
           ▼        ▼
      ┌──────┐  ┌──────────┐  ┌──────────┐
      │ Pri  │  │ Replica1 │  │ Replica2 │
      │  R/W │  │ READ ONLY│  │ READ ONLY│
      └──┬───┘  └──────────┘  └──────────┘
         │  async WAL stream →→→→→→→→→↑

  Replication lag: typically < 100ms
  Read:Write ratio at most companies ≈ 80:20`,
    insight:
      'Most web apps are read-heavy (80%+ reads). Adding a read replica doubles read capacity with near-zero writes overhead. The tradeoff: replication lag means replicas may serve slightly stale data — design your reads to tolerate this.',
  },
  {
    num: 4,
    title: 'Sharding — split the data itself',
    color: '#34d399',
    headline: 'Each shard holds a slice of the data — queries only touch one shard',
    diagram: `  Application → Shard Router

  hash(user_id) % 4:

  user_id=1001 → hash % 4 = 1 → Shard-1  ┐
  user_id=5043 → hash % 4 = 3 → Shard-3  ├ each shard
  user_id=8192 → hash % 4 = 0 → Shard-0  ┘ holds 25% of data
  user_id=9999 → hash % 4 = 3 → Shard-3

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Shard-0  │ │ Shard-1  │ │ Shard-2  │ │ Shard-3  │
  │ 25% data │ │ 25% data │ │ 25% data │ │ 25% data │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘

  Cross-shard queries → expensive! Avoid with good key choice`,
    insight:
      'Sharding is the last resort — it eliminates cross-shard JOINs, complicates transactions, and is painful to reshard later. Exhaust vertical scaling, read replicas, and caching first. When you do shard: the shard key is irreversible — choose one that prevents cross-shard queries for 90%+ of your use cases.',
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
            Scaling strategies · {beginnerMode ? 'step-by-step' : 'auto-play'}
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

export function ScaleUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_scale_understand');

  if (beginnerMode && mounted && isFirstVisit) {
    return (
      <div className="px-8 py-6 content-zone">
        <ConceptGate concepts={SCALE_CONCEPTS} accentColor={COLOR} onReady={markSeen} />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {beginnerMode && mounted && (
        <KeyTermsAccordion concepts={SCALE_CONCEPTS} accentColor={COLOR} />
      )}
      <GuidedTour />

      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">Scaling is like running a restaurant.</strong>{' '}
        Vertical scaling is upgrading your one chef to a superhuman — expensive and there&apos;s a limit.
        Horizontal scaling is hiring more chefs and adding a maître d&apos;{' '}
        (<Term term="load balancer">load balancer</Term>) who seats customers at the least-busy table.{' '}
        <Term term="read replica">Replicas</Term> are like having a copy of the menu at each table (reads are fast,
        no one needs to walk to the kitchen).{' '}
        <Term term="shard">Sharding</Term> is splitting the kitchen — appetizers in room A,
        mains in room B — so each team only handles a subset of orders.
      </ELI5Card>

      {/* Full architecture diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Scaling layers — how they stack</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`Internet
   │
  CDN ──────────────── serves static assets from edge (80% of traffic)
   │
Load Balancer ──────── distributes live requests across app servers
   │
App Servers (3×) ───── stateless, horizontally scaled
   │
Read/Write Router ──── reads → replicas · writes → primary
   │         │
Primary     Replica-1   Replica-2   (async replication, <100ms lag)
   │
Cache (Redis) ──────── hot data in memory, avoids DB entirely
   │
DB Shard Router ────── hash(key) % N → correct shard
   │
Shard-0  Shard-1  Shard-2  Shard-3`}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          Each layer is added only when the previous one is saturated. Most apps never need sharding.
          The order: cache first → read replicas → load balancer → sharding.
        </p>
      </div>

      {/* Core concepts */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Core concepts</h2>
        <div className="space-y-2">
          {[
            { term: 'Stateless',        def: 'App servers hold no per-user state in memory. Session data lives in Redis. Stateless servers can be added/removed freely without routing concerns.' },
            { term: 'Load Balancer',    def: 'Distributes incoming requests across servers. Algorithms: round-robin (even spread), least-connections (adaptive), IP hash (sticky sessions).' },
            { term: 'Read Replica',     def: 'A copy of the primary database serving read traffic. Writes still go to primary which replicates asynchronously. Adds read capacity without write overhead.' },
            { term: 'Sharding',         def: 'Splits the dataset by a shard key (e.g., user_id % N). Each shard is an independent DB. Enables horizontal write scaling but prevents cross-shard JOINs.' },
            { term: 'Consistent Hash',  def: 'Arranges servers on a ring so adding/removing a server only remaps 1/N keys. Avoids cache stampedes when cluster membership changes.' },
            { term: 'Circuit Breaker',  def: 'When a downstream service fails repeatedly, the circuit "opens" and short-circuits calls — returns an error immediately instead of waiting for timeout. Prevents cascading failures.' },
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

      <Callout type="tip" title="The scaling ladder — follow this order:">
        (1) Optimize queries + add indexes.{'  '}
        (2) Add caching (Redis) for hot reads.{'  '}
        (3) Add read replicas when reads dominate.{'  '}
        (4) Add a load balancer + more app servers for compute.{'  '}
        (5) Shard only when a single DB node is the bottleneck on writes.{'  '}
        Most startups stop at step 3. Sharding is a last resort.
      </Callout>
    </div>
  );
}
