'use client';

import { useEffect, useState } from 'react';
import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { Callout } from '@/components/visualizer/shared/Callout';
import { Term } from '@/components/visualizer/shared/Term';
import { ConceptGate } from '@/components/visualizer/shared/ConceptGate';
import { KeyTermsAccordion } from '@/components/visualizer/shared/KeyTermsAccordion';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';
import { useFirstVisit } from '@/hooks/useFirstVisit';

const COLOR = 'var(--c-kafka)';

// ─── Concept gate ─────────────────────────────────────────────────────────────

const KAFKA_CONCEPTS = [
  {
    term: 'Message broker',
    plain: 'A middleman service that holds messages from senders (producers) until receivers (consumers) are ready to process them.',
    analogy: 'A post office — letters (messages) drop in, get sorted into mailboxes (partitions), and picked up when ready.',
  },
  {
    term: 'Partition',
    plain: 'A single ordered lane within a topic. Messages in one partition are always read in the exact order they arrived.',
    analogy: 'A checkout lane at a grocery store — items in your lane stay in your order, even if other lanes move faster.',
  },
  {
    term: 'Offset',
    plain: 'A number saying "I\'ve read up to message #N." Each consumer tracks its own offset — its bookmark in the log.',
    analogy: 'A page number in a book. You decide when to turn the page, and can always go back to re-read.',
  },
];

// ─── Guided tour ───────────────────────────────────────────────────────────────

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
    title: 'Producer publishes a message',
    color: '#a78bfa',
    headline: 'Every message has a key, value, and timestamp',
    diagram: `Producer
  │
  │  ProducerRecord {
  │    topic:     "orders"
  │    key:       "user_42"      ← determines partition
  │    value:     "placed order"
  │    timestamp: 1711234567890
  │  }
  │
  └──────────────────────────────►  Kafka Broker`,
    insight:
      'The key is the routing mechanism. Same key = same partition = guaranteed ordering for that key. If key is null, Kafka round-robins across partitions.',
  },
  {
    num: 2,
    title: 'Broker hashes key → partition',
    color: '#f59e0b',
    headline: 'hash(key) % numPartitions determines where it lands',
    diagram: `Kafka Broker  (topic: orders, 3 partitions)

  key="user_42"  →  hash("user_42") % 3  =  partition-1
  key="user_13"  →  hash("user_13") % 3  =  partition-0
  key="user_99"  →  hash("user_99") % 3  =  partition-2
  key="user_42"  →  hash("user_42") % 3  =  partition-1  ← always!

  ┌─ partition-0 ─────────────────┐
  │  [msg0] [msg1] [msg3] ...     │  ← immutable append-only log
  ├─ partition-1 ─────────────────┤
  │  [msg0] [msg1] [msg2] ...     │
  └─ partition-2 ─────────────────┘`,
    insight:
      'The same key always lands on the same partition. All events for user_42 are in partition-1 — processed in strict order by a single consumer.',
  },
  {
    num: 3,
    title: 'Partition appends to the log',
    color: '#34d399',
    headline: 'Each partition is an immutable, ordered sequence with offsets',
    diagram: `partition-1  (append-only log)

  offset: 0  │ key=user_42  value="clicked buy"     ts=...001
  offset: 1  │ key=user_42  value="placed order"    ts=...002
  offset: 2  │ key=user_42  value="payment ok"      ts=...003
  offset: 3  │ key=user_42  value="order shipped"   ts=...004
             ↑
          next write goes here

  Retention: default 7 days — consumers can replay any offset`,
    insight:
      'Kafka never overwrites. New messages append at the end. Any consumer can rewind to offset 0 and replay the full history — this is what enables event sourcing and audit logs.',
  },
  {
    num: 4,
    title: 'Consumer group reads and commits offset',
    color: '#60a5fa',
    headline: 'Each partition is owned by exactly one consumer in the group',
    diagram: `topic: orders  (3 partitions)  ←  consumer-group: notification-svc

  partition-0  ────────────────►  Consumer A  (committed offset: 8)
  partition-1  ────────────────►  Consumer B  (committed offset: 4)
  partition-2  ────────────────►  Consumer C  (committed offset: 11)

  If Consumer B crashes:
  partition-1  ────────────────►  Consumer A  (rebalance — picks up at offset 4)

  Two groups can read the same topic independently:
  partition-0  ────────────────►  analytics-svc (its own offset pointer)`,
    insight:
      'Offset is just a number. The consumer controls it — commit early = at-most-once, commit after processing = at-least-once. Multiple consumer groups each have their own independent offset per partition.',
  },
];

// ─── GuidedTour ───────────────────────────────────────────────────────────────

function GuidedTour() {
  const { beginnerMode } = useBeginnerModeContext();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const intervalMs = beginnerMode ? 7000 : 3200;

  useEffect(() => {
    if (beginnerMode) setPlaying(false);
  }, [beginnerMode]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TOUR_STEPS.length), intervalMs);
    return () => clearInterval(t);
  }, [playing, intervalMs]);

  // Countdown progress bar (beginner mode only)
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

  const step = TOUR_STEPS[idx]!;

  function goTo(i: number) { setIdx(i); setPlaying(false); }
  function goPrev() { goTo((idx - 1 + TOUR_STEPS.length) % TOUR_STEPS.length); }
  function goNext() { goTo((idx + 1) % TOUR_STEPS.length); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLOR }}>
            Message lifecycle · {beginnerMode ? 'step-by-step' : 'auto-play'}
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

      {/* Countdown progress bar — beginner mode only */}
      {beginnerMode && playing && (
        <div className="h-px w-full bg-[var(--line)] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: COLOR,
              transition: 'width 80ms linear',
            }}
          />
        </div>
      )}

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

export function KafkaUnderstand() {
  const { beginnerMode } = useBeginnerModeContext();
  const { isFirstVisit, markSeen, mounted } = useFirstVisit('ca_fv_kafka_understand');

  if (beginnerMode && mounted && isFirstVisit) {
    return (
      <div className="px-8 py-6 content-zone">
        <ConceptGate concepts={KAFKA_CONCEPTS} accentColor={COLOR} onReady={markSeen} />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      {beginnerMode && mounted && (
        <KeyTermsAccordion concepts={KAFKA_CONCEPTS} accentColor={COLOR} />
      )}
      <GuidedTour />

      <ELI5Card accentColor={COLOR}>
        <strong className="text-[var(--text)]">Think of Kafka like a multi-lane highway with a logbook.</strong>{' '}
        Messages (cars) enter a specific lane (<Term term="partition">partition</Term>) based on their destination (key).
        Each lane has an inspector writing every car in a permanent logbook (the <Term term="offset">offset</Term> log).
        Workers (<Term term="consumer group">consumers</Term>) each own a lane, read from their logbook in order,
        and bookmark where they left off. If a worker calls in sick, another picks up the bookmarked spot and carries on.
      </ELI5Card>

      {/* Full lifecycle diagram */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Full message lifecycle</h2>
        <div className="bg-[var(--bg1)] rounded-lg border border-[var(--line)] p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto">
{`  Producer                 Kafka Broker (topic: orders)           Consumer Group
                           ┌─ Partition 0 ──────────┐
  key=user_13  ──hash─►   │ off:0 off:1 off:2 ...  ├──► Consumer A  (offset: 3)
                           ├─ Partition 1 ──────────┤
  key=user_42  ──hash─►   │ off:0 off:1 off:2 ...  ├──► Consumer B  (offset: 3)
                           ├─ Partition 2 ──────────┤
  key=user_99  ──hash─►   │ off:0 off:1 ...        ├──► Consumer C  (offset: 2)
                           └────────────────────────┘
                                retained 7 days — consumers can replay from any offset`}
        </div>
      </div>

      {/* Key concepts grid */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Core concepts</h2>
        <div className="space-y-2">
          {[
            { term: 'Topic',          def: 'A named stream of records. Like a database table, but append-only and distributed.' },
            { term: 'Partition',      def: <><Term term="partition">A single ordered log</Term> within a topic. The unit of parallelism — more partitions = more concurrent consumers.</> },
            { term: 'Offset',         def: <><Term term="offset">A monotonically increasing integer</Term> — the position of a record in a partition. Consumers track their own offset.</> },
            { term: 'Consumer Group', def: <><Term term="consumer group">A set of consumers</Term> sharing the work. Each partition is assigned to exactly one consumer in the group at a time.</> },
            { term: 'Retention',      def: 'Kafka keeps messages for a configurable time (default 7 days) regardless of whether they were consumed. Replay is free.' },
            { term: 'Replication',    def: 'Each partition has N replicas across brokers. One is the leader (serves reads/writes), others are in-sync replicas (ISR).' },
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

      <Callout type="tip" title="Partition key strategy:">
        Choose a key with high cardinality that groups related messages.{' '}
        <strong className="text-[var(--text)]">user_id</strong> ensures all events for a user go to the same partition — ordering preserved, one consumer processes all their events.{' '}
        <strong className="text-[var(--text)]">Random keys</strong> maximize throughput but lose ordering. Never use a low-cardinality key (e.g., country code) — you get hot partitions.
      </Callout>
    </div>
  );
}
