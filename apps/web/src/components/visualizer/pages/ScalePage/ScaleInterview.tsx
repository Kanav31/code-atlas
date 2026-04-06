import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-scale)';

const CONCEPTUAL = [
  {
    q: 'What is the difference between horizontal and vertical scaling? When would you choose each?',
    a: 'Vertical scaling (scale up) adds more CPU/RAM to a single machine. It\'s simple — no code changes needed — but has a hardware ceiling (~128 cores, ~$50K/month), creates a single point of failure, and requires downtime to resize. Horizontal scaling (scale out) adds more machines behind a load balancer. It\'s theoretically unlimited, provides redundancy, and adds capacity without downtime — but requires stateless services and adds operational complexity. Choose vertical for database primaries and stateful services where you want to avoid distributed systems complexity. Choose horizontal for stateless app servers, caches, and any service that can be replicated.',
  },
  {
    q: 'Explain consistent hashing and why it matters for cache clusters.',
    a: 'In a naive sharding scheme (hash(key) % N servers), adding or removing one server remaps virtually all keys — causing a cache stampede where every key misses at once, hammering the origin. Consistent hashing places servers at positions on a hash ring (0–360°). Each key maps to the next server clockwise. When a server is added or removed, only the keys between the two neighboring servers on the ring are remapped — on average 1/N of all keys. Virtual nodes (100+ ring positions per physical server) improve load distribution. Used by: Memcached clients (ketama), Redis Cluster, Cassandra, Cloudflare\'s Pingora.',
  },
  {
    q: 'What is CAP theorem and how does it affect system design decisions?',
    a: 'CAP theorem states a distributed system can guarantee at most two of: Consistency (all nodes see the same data simultaneously), Availability (every request gets a response), Partition Tolerance (system works despite network splits). Since network partitions are inevitable, you must choose between CP and AP. CP systems (HBase, Zookeeper, etcd) block writes during partitions and wait for consensus — right for financial systems, inventory, anything where stale reads are dangerous. AP systems (Cassandra, DynamoDB, CouchDB) continue serving requests but may return stale data — right for social feeds, product catalogs, user profiles. Most web apps can tolerate eventual consistency (AP) for better availability.',
  },
  {
    q: 'What is a read replica and how does it differ from sharding?',
    a: 'A read replica is a full copy of the primary database that serves only read traffic. Writes go to primary, which replicates asynchronously to replicas (typically <100ms lag). Read replicas scale read capacity linearly — add 3 replicas, read capacity roughly quadruples. Data volume is unchanged; every replica holds all the data. Sharding splits the dataset horizontally — each shard holds a partition of the data (e.g., 25% with 4 shards). Sharding scales write capacity and storage. The tradeoff: sharding prevents cross-shard JOINs and complicates transactions. Best approach: use read replicas first; add sharding only when a single primary\'s write capacity or storage is exhausted.',
  },
  {
    q: 'What is a circuit breaker pattern and when does it trigger?',
    a: 'A circuit breaker wraps calls to a downstream service and tracks failure rate. It has three states: Closed (normal operation, calls pass through), Open (after N failures in a window, short-circuit all calls — return error immediately without waiting for timeout), Half-Open (after a cooldown period, allow one test request through; if it succeeds, close the circuit). This prevents cascading failures: without a circuit breaker, a slow database causes threads to pile up waiting for timeouts, exhausting the thread pool and crashing the caller too. Netflix\'s Hystrix and Resilience4j implement this pattern. Trigger thresholds: typically 50%+ failure rate over 20+ requests in 10 seconds.',
  },
  {
    q: 'What does "stateless" mean and why is it required for horizontal scaling?',
    a: 'A stateless service stores no per-user data in memory between requests. Every piece of state (sessions, user data, cart) lives in an external store (Redis, database). A stateless service can receive any request from any client regardless of which instance handled the previous request — so a load balancer can freely route any request to any server. A stateful service (session stored in-memory) requires the same server to handle all requests from one client (sticky sessions) — now you can\'t freely scale or replace instances. Practically: move sessions to Redis, move uploads to S3, move queues to Kafka, and your app servers become fungible.',
  },
];

const SCENARIO = [
  {
    q: 'Design a URL shortener (like bit.ly) that handles 1 billion redirects per day. Walk through the scaling approach.',
    a: '1B redirects/day = ~11,500 rps average, ~50K rps at peak. Architecture: (1) Stateless app servers behind a load balancer (least-connections). (2) Redis cache for hot URLs — bit.ly\'s top 1% URLs account for 80% of traffic; cache them in memory (100ns lookup vs 1ms DB). (3) Read replicas for the long-tail URL lookups that miss cache. (4) Single primary for writes (URL creation rate is 1% of reads — maybe 500/s, easily handled by one Postgres). (5) CDN at the edge for the most popular redirects — return 301 cached at the CDN for zero origin traffic. Sharding: not needed until write volume or data size (1B rows × ~500 bytes ≈ 500GB) overwhelms a single instance — addressable with a larger machine or a single shard split by URL hash prefix.',
  },
  {
    q: 'Your Postgres primary CPU is at 100% during peak. How do you diagnose and fix it?',
    a: 'Step 1: Diagnose with pg_stat_activity — look for long-running queries, lock waits, and idle-in-transaction sessions. Run EXPLAIN ANALYZE on the top CPU consumers. Step 2: Quick fixes without schema changes — add missing indexes (EXPLAIN will show Seq Scan on large tables), kill idle-in-transaction sessions holding locks, increase work_mem to reduce disk sorts. Step 3: If reads dominate (>60% of queries) — add a read replica and route reads there. PgBouncer for connection pooling reduces the overhead of 1000+ connections. Step 4: If writes are the bottleneck — vertical scale the primary (faster I/O, more cores). Step 5: If nothing works — archive old data to cold storage, partition large tables by time, or plan a sharding migration with Citus or Vitess.',
  },
  {
    q: 'One of your four Kafka consumers is processing 80% of messages while the others sit idle. What\'s wrong?',
    a: 'This is a hot partition caused by a low-cardinality or skewed partition key. If the key is something like country code, most traffic might be "US" which always routes to the same partition (hash("US") % 4 = constant) — and that partition is assigned to one consumer. Diagnoses: check partition lag per partition (kafka-consumer-groups.sh --describe); if one partition has 10× the offset growth rate, it\'s hot. Fixes: (1) Change the partition key to a higher-cardinality field (user_id, session_id). (2) If you must use country code, add a random suffix to spread: "US_3" — but you lose ordering guarantees. (3) Increase partition count (this requires recreating the topic — downtime or dual-write during migration). (4) For celebrity/hot-key scenarios, route those keys to a dedicated topic with more partitions.',
  },
  {
    q: 'A new engineer added 8 indexes to a users table. Deploys are fine but write throughput dropped 60%. What happened and how do you fix it?',
    a: 'Every INSERT or UPDATE must update all 8 indexes in addition to the table itself — 9 writes per logical write. On a 50M-row table, each index is multi-GB and index updates require random I/O. Fix strategy: (1) Identify unused indexes: SELECT indexname, idx_scan FROM pg_stat_user_indexes WHERE relname = \'users\' ORDER BY idx_scan — indexes with idx_scan = 0 after a week of normal traffic are candidates for removal. (2) DROP INDEX CONCURRENTLY for each unused index (no table lock). (3) For indexes that are used but the write cost is too high, evaluate whether the query can be redesigned to avoid the index (caching, denormalization) or whether a partial index (WHERE deleted_at IS NULL) reduces the index size. (4) Going forward: require EXPLAIN ANALYZE benchmarks before adding indexes to high-write tables.',
  },
];

const TRADEOFFS = [
  {
    q: 'Microservices vs monolith — which scales better?',
    a: 'Neither inherently — it depends on the bottleneck. A well-optimized monolith running on horizontal app servers scales further than most companies ever need. Microservices enable independent scaling of specific services (e.g., scale the video transcoding service 100× without touching user auth). The real tradeoffs: Monolith wins on operational simplicity, zero network latency between modules, atomic transactions, and easier local development. Microservices win when different parts of the system have wildly different scaling requirements, different deployment cadences, or different team ownership. The mistake: breaking into microservices too early introduces distributed systems complexity (network failures, eventual consistency, distributed tracing) before you have the scale to justify it. Start with a modular monolith; extract services at clear seams when a specific service is the scaling bottleneck.',
  },
  {
    q: 'Synchronous vs asynchronous replication — what are the tradeoffs?',
    a: 'Synchronous replication (acks=all in Kafka; synchronous_commit=on in Postgres): the write only returns after at least one replica confirms it. Zero data loss on primary failure — any promoted replica has all committed data. Cost: every write adds one round-trip of network latency (~1–5ms in the same region). Use for: financial transactions, anything where data loss is catastrophic. Asynchronous replication (default Postgres streaming replication): the write returns after the primary writes to WAL, replicas catch up in the background. Latency is unchanged; throughput is higher. Risk: if the primary fails before the replica catches up, the promoted replica is missing recent commits — potentially seconds of data loss. Use for: read replicas, analytics, cases where a tiny window of data loss is acceptable. Most apps use async replication for replicas and accept the tradeoff.',
  },
  {
    q: 'When is a cache a bad idea?',
    a: 'Caching is dangerous when: (1) Data changes frequently and staleness causes correctness issues (e.g., inventory counts — you may sell the same item twice). (2) Cache invalidation is complex — if 10 different data sources can change a cached value, you\'ll inevitably serve stale data. (3) You\'re caching writes (write-through caches are harder to reason about than read-through). (4) The cache is a single point of failure with no fallback path — if Redis goes down, does your app gracefully degrade or crash? (5) Cache stampede: when a popular cached item expires, hundreds of requests simultaneously hit the database. Fix: probabilistic early expiration or mutex-based cache population. The right model: cache computed or read-heavy data that changes infrequently, always design a fallback to the source, and monitor cache hit ratio (below 80% means the cache isn\'t helping much).',
  },
];

export function ScaleInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['horizontal vs vertical scaling', 'load balancers', 'stateless servers']} />

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Conceptual questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Core mechanics — load balancing, consistent hashing, CAP theorem, and statelessness.
        </p>
        <InterviewQA items={CONCEPTUAL} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Scenario questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          System design problems: URL shorteners, hot partitions, slow databases, index overload.
        </p>
        <InterviewQA items={SCENARIO} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Trade-off questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Microservices vs monolith, replication tradeoffs, and when caching backfires.
        </p>
        <InterviewQA items={TRADEOFFS} accentColor={COLOR} />
      </div>

      <Callout type="tip" title="The interviewer's real question:">
        Every scalability question is really asking: &ldquo;Do you know the order to apply solutions?&rdquo;
        The answer is always: optimize first → cache → read replicas → horizontal app servers → shard.
        Candidates who jump to sharding on question one fail. Lead with the simplest solution,
        state its limit, then escalate. That&apos;s senior-level thinking.
      </Callout>
    </div>
  );
}
