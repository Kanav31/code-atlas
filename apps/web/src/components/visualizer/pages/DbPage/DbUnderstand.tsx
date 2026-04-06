'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-db)';

// ─── Concept gate ─────────────────────────────────────────────────────────────

const DB_CONCEPTS = [
  {
    term: 'SQL Query',
    plain: 'A question you ask the database, written in a special language. "Give me all users where id = 42."',
    analogy: 'Asking a librarian to find a book — the librarian (query planner) decides the fastest way to find it.',
  },
  {
    term: 'Index',
    plain: 'A sorted shortcut the database builds so it can find rows without reading every single row on disk.',
    analogy: 'A book\'s back-of-book index — you go straight to page 47 instead of reading every page.',
  },
  {
    term: 'Transaction',
    plain: 'A group of database changes that either ALL succeed or ALL fail. No partial results allowed.',
    analogy: 'A bank transfer: debit one account AND credit another must both succeed, or neither happens.',
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
    title: 'SQL query hits the query planner',
    color: '#60a5fa',
    headline: 'The planner decides HOW to execute your query before touching any data',
    diagram: `Client
  │
  │  SELECT * FROM users WHERE id = 42
  │
  └──────────────────► Query Planner
                             │
                      ┌──────┴──────────────────┐
                      │  Statistics say:        │
                      │  table rows  = 1,000    │
                      │  indexes     = [id_pkey]│
                      │  target rows = 1        │
                      └──────┬──────────────────┘
                             │
                      Index Scan (cost=0.28..8.30)
                             │
                         Storage`,
    insight:
      'The query planner uses table statistics (row count, cardinality, value distribution) to choose between a sequential scan or an index scan. EXPLAIN ANALYZE shows exactly which path was taken and why.',
  },
  {
    num: 2,
    title: 'Full table scan — O(n)',
    color: '#f87171',
    headline: 'Without an index every row is read from disk until the match is found',
    diagram: `users table  (8 rows shown — imagine 10,000,000)

  page 1: [row 1] [row 2] [row 3] [row 4]  ← read all
  page 2: [row 5] [row 6] [row 7] [row 8]  ← read all
  ...
  page N: ...                               ← read all

  WHERE id = 42  →  check every row

  Rows read:   ~5,000,000  (average)
  Time:        800ms on 10M rows
  I/O:         sequential (predictable, but expensive at scale)`,
    insight:
      'Sequential scans are not always bad — for small tables or queries returning >10% of rows, a full scan beats an index (avoids random I/O). The planner knows this and makes the right call automatically.',
  },
  {
    num: 3,
    title: 'B-tree index — O(log n)',
    color: '#34d399',
    headline: 'An index is a sorted tree that narrows the search to 3–4 comparisons regardless of table size',
    diagram: `B-tree on users.id  (height = 3 for 10M rows)

              [root: 500]
             /            \\
      [250]               [750]
      /   \\               /   \\
  [125] [375]         [625] [875]
    ...   ...           ...   ...
      └─ leaf page: [40] [41] [42] ← found!

  Comparisons:  3  (same for 10M or 10B rows)
  Time:         < 1ms
  I/O:          3 page reads (root + internal + leaf)`,
    insight:
      'B-trees stay balanced via splits and merges. A 3-level tree handles up to ~16M rows with 3 comparisons. A 4-level tree: ~4B rows, 4 comparisons. Index scans are O(log n) regardless of table size — this is the fundamental reason indexes exist.',
  },
  {
    num: 4,
    title: 'ACID transaction — all or nothing',
    color: '#a78bfa',
    headline: 'A transaction bundles multiple writes into one atomic unit with rollback protection',
    diagram: `BEGIN TRANSACTION
  │
  ├─ UPDATE accounts SET balance = balance - 100 WHERE id = 1
  │    → WAL write: "account-1: $1000 → $900"
  │
  ├─ UPDATE accounts SET balance = balance + 100 WHERE id = 2
  │    → WAL write: "account-2: $500 → $600"
  │
  ├─ CHECK constraints  →  OK
  │
  └─ COMMIT
       → WAL flushed to disk  (durability)
       → locks released       (isolation)

  If crash between step 1 and 2 →  WAL replays on recovery → rollback`,
    insight:
      'The Write-Ahead Log (WAL) is written before any data page changes. On crash, Postgres replays the WAL to restore consistency. This is why committed data survives power loss — the WAL hit durable storage before COMMIT returned.',
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
            Query lifecycle · {beginnerMode ? 'step-by-step' : 'auto-play'}
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

export function DbUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_db_understand');

  if (beginnerMode && mounted && isFirstVisit) {
    return (
      <div className="px-8 py-6 content-zone">
        <ConceptGate concepts={DB_CONCEPTS} accentColor={COLOR} onReady={markSeen} />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {beginnerMode && mounted && (
        <KeyTermsAccordion concepts={DB_CONCEPTS} accentColor={COLOR} />
      )}
      <GuidedTour />

      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">An index is like a book&apos;s back-of-book index.</strong>{' '}
        Without it, you&apos;d read every page to find &ldquo;database.&rdquo; With it, you go straight to page 47.
        A B-tree index sorts values so any record is found in 3–4 steps whether the table has 100 or 100 million rows.
        Transactions are like editing a shared document with auto-save: if your internet cuts out mid-edit,
        your half-written changes disappear — the document stays in the last clean state.
      </ELI5Card>

      {/* Full query lifecycle diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Full query lifecycle</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`  Client                  PostgreSQL                        Disk
    │                          │                               │
    │─ SELECT * FROM users ────►│                               │
    │   WHERE id = 42           │                               │
    │                    Query Planner                          │
    │                    (choose access path)                   │
    │                          │                               │
    │                    ┌─────┴──────┐                        │
    │                    ▼            ▼                         │
    │              Seq Scan      Index Scan                     │
    │              O(n)=slow     O(log n)=fast                  │
    │                    └─────┬──────┘                        │
    │                          │─ fetch pages ────────────────►│
    │                          │◄─ data pages ─────────────────│
    │◄─ result rows ───────────│                               │`}
        </div>
      </div>

      {/* Core concepts */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Core concepts</h2>
        <div className="space-y-2">
          {[
            { term: 'B-tree Index',    def: 'A balanced sorted tree that stores key → row pointer. Height stays ~log₃(n) so comparisons scale logarithmically. Default index type in Postgres/MySQL.' },
            { term: 'Sequential Scan', def: 'Read every page in the table from start to finish. O(n). Preferred by the planner when returning >~10% of rows or the table is tiny.' },
            { term: 'Query Planner',   def: 'Chooses the execution strategy (seq scan vs index scan vs hash join…) based on table statistics. EXPLAIN ANALYZE shows its decision and actual cost.' },
            { term: 'ACID',            def: 'Atomicity (all-or-nothing) + Consistency (constraints always valid) + Isolation (concurrent transactions don\'t interfere) + Durability (committed data survives crash).' },
            { term: 'WAL',             def: 'Write-Ahead Log — changes are written to an append-only log before touching data pages. Crash recovery replays the WAL. The source of Postgres durability.' },
            { term: 'Isolation Level', def: 'Controls what a transaction can see from concurrent writes. READ COMMITTED (default) → REPEATABLE READ → SERIALIZABLE. Higher = safer, slower.' },
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

      <Callout type="tip" title="When to run EXPLAIN ANALYZE:">
        Any query taking &gt;100ms in production deserves an EXPLAIN ANALYZE. Look for&nbsp;
        <strong className="text-[var(--text)]">Seq Scan</strong> on large tables (missing index),&nbsp;
        <strong className="text-[var(--text)]">rows=10000 actual=1</strong> (stale statistics — run ANALYZE),
        and <strong className="text-[var(--text)]">nested loops with index scans</strong> on the inner side (N+1 in disguise).
      </Callout>
    </div>
  );
}
