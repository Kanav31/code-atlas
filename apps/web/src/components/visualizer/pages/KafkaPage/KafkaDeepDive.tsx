import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-kafka)';

const BLOG_LINKS = [
  {
    company: 'LinkedIn',
    logo: 'in',
    color: '#0A66C2',
    title: 'The Log: What every software engineer should know about real-time data',
    description:
      "Jay Kreps' legendary essay (written while building Kafka at LinkedIn) explains why the append-only log is the unifying abstraction behind databases, replication, and stream processing. The foundation of everything Kafka is built on.",
    url: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying',
    tag: 'Kafka origin · Log theory · Must-read',
  },
  {
    company: 'Confluent',
    logo: 'C',
    color: '#0A3D62',
    title: 'How Kafka is Like a Database (and How It Isn\'t)',
    description:
      "Confluent's deep dive into what makes Kafka fundamentally different from traditional message queues — retention, offset replay, consumer groups, and why it works as an event store rather than just a transport layer.",
    url: 'https://www.confluent.io/blog/how-kafka-is-like-a-database/',
    tag: 'Architecture · Event sourcing',
  },
  {
    company: 'Uber',
    logo: 'U',
    color: '#000000',
    title: 'Reliable Reprocessing with Kafka at Uber',
    description:
      "How Uber uses Kafka's offset replay to reprocess billions of events when bugs are discovered — without losing data. Covers their dead-letter queue pattern and how they manage consumer group lag across 1,000+ topics.",
    url: 'https://www.uber.com/blog/reliable-reprocessing/',
    tag: 'Offset replay · DLQ · Scale',
  },
  {
    company: 'Shopify',
    logo: 'S',
    color: '#96BF48',
    title: 'Capturing Every Change from Shopify\'s Sharded Monolith',
    description:
      "How Shopify built Change Data Capture (CDC) with Kafka to stream every database mutation across 10,000+ shards in real time — powering analytics, cache invalidation, and search indexing without coupling to the monolith.",
    url: 'https://shopify.engineering/capturing-every-change-shopify-sharding',
    tag: 'CDC · Database integration',
  },
  {
    company: 'Netflix',
    logo: 'N',
    color: '#E50914',
    title: 'Kafka Inside Keystone Pipeline — Netflix\'s Data Highway',
    description:
      "Netflix processes 700 billion events per day through their Kafka-based Keystone pipeline — routing play events, errors, and A/B test data to Flink, Spark, and Elasticsearch in real time. Covers their multi-region replication strategy.",
    url: 'https://netflixtechblog.com/keystone-real-time-stream-processing-platform-a3ee651812a',
    tag: 'Stream processing · Scale · Multi-region',
  },
];

export function KafkaDeepDive() {
  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      <BeginnerWarning prerequisites={['message brokers', 'partitions and offsets', 'consumer groups']} />

      {/* Log structure */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Kafka's log structure</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`partition-1/                         ← directory on disk
  00000000000000000000.log           ← active segment (append here)
  00000000000000000000.index         ← sparse offset → byte-position index
  00000000000000012345.log           ← older segment (sealed, read-only)
  00000000000000012345.timeindex     ← timestamp → offset index

  Each record in the .log file:
  ┌──────────┬────────┬──────────────────────────────┐
  │  offset  │  size  │  key + value + timestamp + ...│
  └──────────┴────────┴──────────────────────────────┘

  Sequential disk writes → ~600MB/s throughput (same as memory for sequential I/O)
  Zero-copy reads: sendfile() syscall moves data disk → NIC without userspace copy`}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          Kafka's speed comes from sequential I/O (append-only = no random writes) and zero-copy reads. A 7-day retention window on a 3-partition topic at 10K msg/s (avg 1KB/msg) uses ~{(10000 * 1000 * 86400 * 7 / 1e12).toFixed(1)}TB of disk per partition — traded for the ability to replay any event at any time.
        </p>
      </div>

      {/* Replication */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Replication & durability</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`  topic: orders  partition-0  replication-factor=3

  Broker 1  [LEADER]   │  off:0  off:1  off:2  off:3  ← producers write here
  Broker 2  [FOLLOWER] │  off:0  off:1  off:2  off:3  ← ISR: in-sync replica
  Broker 3  [FOLLOWER] │  off:0  off:1  off:2          ← catching up (not ISR)

  ack=all (default): producer waits for ALL ISR replicas to confirm write
  ack=1:             producer waits for leader only (faster, less durable)
  ack=0:             fire-and-forget (fastest, messages can be lost)

  If Broker 1 dies → Broker 2 is elected leader in <30s (ZooKeeper / KRaft)`}
        </div>
      </div>

      {/* Kafka vs RabbitMQ vs SQS */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Kafka vs RabbitMQ vs SQS</h2>
        <div className="space-y-2">
          {[
            { label: 'Category',      kafka: 'Kafka',               rabbit: 'RabbitMQ',         sqs: 'Amazon SQS',       isHeader: true },
            { label: 'Model',         kafka: 'Log / pull',          rabbit: 'Queue / push',     sqs: 'Queue / pull'      },
            { label: 'Retention',     kafka: '7 days (configurable)', rabbit: 'Until consumed', sqs: '14 days max'       },
            { label: 'Replay',        kafka: 'Yes — any offset',    rabbit: 'No',               sqs: 'No'                },
            { label: 'Ordering',      kafka: 'Per partition',       rabbit: 'Per queue',        sqs: 'FIFO queues only'  },
            { label: 'Throughput',    kafka: 'Millions/sec',        rabbit: '~50K/sec',         sqs: '~3K/sec std'       },
            { label: 'Best for',      kafka: 'Event streaming, CDC', rabbit: 'Task queues, RPC', sqs: 'Simple async jobs'  },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-4 items-center gap-3 rounded-lg border px-4 py-2.5 text-[11px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <span className="font-semibold font-mono" style={{ color: row.isHeader ? 'var(--muted)' : 'var(--muted)' }}>
                {row.label}
              </span>
              <span className="font-semibold" style={{ color: row.isHeader ? COLOR : 'var(--text2)' }}>{row.kafka}</span>
              <span className="text-[var(--text2)]">{row.rabbit}</span>
              <span className="text-[var(--text2)]">{row.sqs}</span>
            </div>
          ))}
        </div>
      </div>

      <Callout type="info" title="Consumer group rebalancing:">
        When a consumer joins or leaves, Kafka reassigns partitions — all consumption pauses during
        this rebalance. Kafka 2.4+ cooperative rebalancing minimizes disruption by only moving
        partitions that need to change owners. Design consumers to be stateless so rebalancing is safe.
      </Callout>

      <Callout type="warn" title="Common mistakes:">
        (1) Too few partitions — bottlenecks throughput and limits consumer parallelism.
        (2) Low-cardinality partition keys (e.g., boolean flags) — creates hot partitions.
        (3) Not handling rebalance events — consumer loses in-flight work.
        (4) Committing offsets before processing — data loss on crash (use at-least-once instead).
      </Callout>

      {/* Big Tech blog links */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech uses Kafka</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Engineering posts from teams running Kafka at billions-of-events-per-day scale.
        </p>
        <div className="space-y-3">
          {BLOG_LINKS.map((link) => (
            <a
              key={link.company}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border p-4 transition-all block group"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)', textDecoration: 'none' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: link.color }}
              >
                {link.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-[12px] font-semibold leading-snug group-hover:underline" style={{ color: 'var(--text)' }}>
                    {link.title}
                  </p>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className="flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
                    <path d="M3.5 1H11M11 1V8.5M11 1L1 11" stroke="var(--text2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed mb-2">{link.description}</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{ color: link.color, background: `color-mix(in srgb, ${link.color} 12%, transparent)` }}
                  >
                    {link.company}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--muted)]">{link.tag}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <Callout type="tip" title="The pattern across all these companies:">
        Every team above uses Kafka as the central nervous system — not just a queue, but a durable
        log that multiple services replay independently. Producers write once; 10 different consumer
        groups (analytics, search, cache, email, audit) read on their own schedule. This is the core
        insight from Jay Kreps&apos; &ldquo;The Log&rdquo; — the append-only log is the unifying abstraction.
      </Callout>
    </div>
  );
}
