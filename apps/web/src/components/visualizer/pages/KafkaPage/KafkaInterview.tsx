import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-kafka)';

const CONCEPTUAL = [
  {
    q: 'What is a Kafka partition and why does it matter?',
    a: 'A partition is a single ordered, immutable log within a topic. It is the unit of parallelism — each partition can be read by exactly one consumer in a consumer group at a time. More partitions = higher throughput, but also more file handles, more replication overhead, and longer leader-election times on failure. You cannot reduce partition count after creation without recreating the topic.',
  },
  {
    q: 'How does a consumer group achieve parallel consumption?',
    a: 'Kafka assigns partitions to consumers in the group so that each partition is owned by exactly one consumer at any point. A topic with 6 partitions and a group with 3 consumers gives each consumer 2 partitions. If you add a 7th consumer it sits idle — you can never have more active consumers than partitions. This is the key scaling knob: partition count sets the ceiling for consumer parallelism.',
  },
  {
    q: 'What guarantees does Kafka make about message ordering?',
    a: 'Kafka guarantees ordering within a single partition. Messages with the same key always route to the same partition (via hash(key) % numPartitions), so all events for a given user or entity arrive in order to a single consumer. Cross-partition ordering is not guaranteed — if you need total ordering across a topic, you must use a single partition (sacrificing parallelism).',
  },
  {
    q: 'What is an offset and who controls it?',
    a: 'An offset is a monotonically increasing integer that uniquely identifies each record within a partition. The consumer controls its own offset — Kafka does not track "consumption". A consumer commits its offset (to the internal __consumer_offsets topic) to checkpoint progress. Commit before processing = at-most-once (data loss on crash). Commit after processing = at-least-once (duplicate on crash). Transactional producers + consumers enable exactly-once semantics.',
  },
  {
    q: 'Explain Kafka\'s replication model and what "ISR" means.',
    a: 'Each partition has a leader and N-1 follower replicas across brokers. The leader handles all reads and writes. Followers fetch from the leader and must stay within `replica.lag.time.max.ms` of the leader to be in the In-Sync Replica (ISR) set. With `acks=all`, a producer waits for all ISR replicas to acknowledge the write. If the leader fails, one of the ISR followers is elected leader in under 30 seconds (KRaft mode is faster than ZooKeeper).',
  },
  {
    q: 'What happens during a consumer group rebalance?',
    a: 'A rebalance is triggered when a consumer joins, leaves, or crashes, or when partition count changes. During a rebalance all consumption pauses while Kafka reassigns partitions. Kafka 2.4+ introduced cooperative incremental rebalancing, which only revokes and reassigns partitions that need to move — consumers keep their unaffected partitions and continue reading, dramatically reducing stop-the-world pauses. Design consumers to be stateless and idempotent so rebalancing is always safe.',
  },
];

const SCENARIO = [
  {
    q: 'You\'re building an order processing system. Orders must be processed in sequence per customer. How do you design your Kafka topology?',
    a: 'Use `customer_id` as the partition key. hash(customer_id) % numPartitions guarantees all orders for a customer land on the same partition, ensuring sequential processing by a single consumer instance. Set partition count to match your max expected consumer parallelism (e.g., 24 partitions for 24 consumer instances). Use `acks=all` and `min.insync.replicas=2` for durability. Add a dead-letter topic for orders that fail processing after N retries to prevent one bad order from blocking the partition.',
  },
  {
    q: 'Your team is tracking user activity events (clicks, page views) at 5 million events/minute. The analytics team needs to reprocess last month\'s data after a bug. How does Kafka handle this?',
    a: 'Kafka\'s retention-based model makes this trivial: set `retention.ms` to cover 30+ days (storage is cheap compared to the ability to replay). The analytics consumer group simply resets its committed offset (`kafka-consumer-groups.sh --reset-offsets --to-earliest`) and replays from the beginning. The production consumer group is unaffected — each group maintains independent offset pointers. This is impossible with traditional queues (RabbitMQ/SQS) where consumed messages are deleted.',
  },
  {
    q: 'A Kafka consumer is processing payments but you discover it committed offsets before successfully writing to the database. How do you recover?',
    a: 'This is the at-most-once mistake — offsets committed before processing means crashes silently drop events. Recovery: (1) Identify the last successful database write\'s corresponding Kafka offset. (2) Use `kafka-consumer-groups.sh --reset-offsets --to-offset <N>` to rewind the consumer group. (3) Reprocess from that offset, making the DB writes idempotent (upsert by payment_id). (4) Fix the consumer to commit offsets only after the DB write succeeds (at-least-once). Consider transactional outbox or Kafka transactions for exactly-once if duplicates are unacceptable.',
  },
  {
    q: 'You need to stream every row-level change from a PostgreSQL database into Kafka for downstream services. What pattern do you use?',
    a: 'Change Data Capture (CDC) via Debezium (or similar). Debezium uses PostgreSQL\'s logical replication slot to capture every INSERT/UPDATE/DELETE as a structured event and publishes to Kafka topics (one per table). Downstream consumers (search indexing, cache invalidation, analytics) subscribe independently. Key advantages: zero coupling to the application layer, guaranteed ordering per primary key (use PK as partition key), and the ability for new services to replay full table history from offset 0. This is what Shopify uses across 10,000+ shards.',
  },
];

const TRADEOFFS = [
  {
    q: 'When would you choose RabbitMQ or SQS over Kafka?',
    a: 'Choose RabbitMQ when: (1) you need complex routing (topic exchanges, fanout, header-based routing), (2) message TTL/priority queues matter, (3) you want push-based delivery with per-message acknowledgment. Choose SQS when: (1) you\'re fully AWS-native and want zero ops, (2) throughput is modest (<3K/sec standard, <300/sec FIFO), (3) you only need simple async job dispatch with no replay. Choose Kafka when: (1) throughput exceeds ~50K/sec, (2) multiple independent consumers read the same stream, (3) you need replay / event sourcing / audit logs, (4) retention matters more than immediate delivery.',
  },
  {
    q: 'What are the hidden costs of increasing partition count?',
    a: 'Partitions are not free: each partition is a directory with open file handles (.log, .index, .timeindex). At 1,000 partitions you have 3,000+ open files per broker. More partitions = longer leader election on broker failure (each partition must elect independently). More partitions = more memory pressure on producers and consumers buffering per-partition. Practical rule: start with 3–6 partitions per topic and scale up — you can increase but never decrease. Target ~100 partitions per broker as a ceiling, not a default.',
  },
  {
    q: 'A team proposes using Kafka as a database — storing all application state as events and rebuilding views on the fly. What are the tradeoffs?',
    a: 'Event sourcing via Kafka has real benefits: full audit log, temporal queries, easy rebuild of derived views, decoupled consumers. But the costs are significant: (1) compacted topics help but are not a substitute for indexed queries — point lookups require replaying the entire partition. (2) Schema evolution is hard — old events must stay readable forever. (3) Consumer startup time grows with history depth (use snapshots to mitigate). (4) Operational complexity: you now have two sources of truth (Kafka + derived state stores). Use Kafka for event streaming; use a database (Postgres, Cassandra) for the materialized views that consumers build from those events.',
  },
];

export function KafkaInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['message brokers', 'partitions and offsets', 'consumer groups']} />

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Conceptual questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Core mechanics — partitions, offsets, replication, and consumer groups.
        </p>
        <InterviewQA items={CONCEPTUAL} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Scenario questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          System design problems where Kafka is (or isn't) the right tool.
        </p>
        <InterviewQA items={SCENARIO} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Trade-off questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          When to use Kafka, when not to, and what the hidden costs are.
        </p>
        <InterviewQA items={TRADEOFFS} accentColor={COLOR} />
      </div>

      <Callout type="tip" title="The interviewer's real question:">
        Almost every Kafka question is actually asking: "Do you understand that Kafka is a log, not a queue?"
        If you frame every answer around retention, replay, and independent consumer groups you will stand out.
        The partition key question in particular — wrong answer (random key) = hot partitions + lost ordering.
      </Callout>

    </div>
  );
}
