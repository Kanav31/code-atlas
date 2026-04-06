import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-db)';

const CONCEPTUAL = [
  {
    q: 'How does a B-tree index speed up queries, and what is its time complexity?',
    a: 'A B-tree is a balanced sorted tree where each node holds multiple keys and child pointers. A query traverses root → internal nodes → leaf page in O(log n) steps. A table with 1M rows has a tree of height ~3, meaning 3 page comparisons to find any row. A full table scan would need ~500,000 comparisons on average. For a table with 1B rows, the B-tree height grows to ~5 — still just 5 comparisons. The index is stored on disk as 8KB pages; internal nodes are usually cached in shared_buffers, so often only the leaf page requires an actual disk read.',
  },
  {
    q: 'Explain ACID. Can you give a concrete example of each property?',
    a: 'Atomicity: a bank transfer of $100 deducts from account A and credits account B — if the credit fails, the debit is rolled back. No partial update exists. Consistency: a NOT NULL constraint ensures balance can never be stored as NULL — the database moves between two valid states. Isolation: while the transfer is in-progress, another transaction querying account A sees either the old $1,000 or the new $900, never an intermediate state (with READ COMMITTED isolation). Durability: once COMMIT returns, the WAL is on disk — a power failure immediately after COMMIT loses no data.',
  },
  {
    q: 'When should you NOT add an index?',
    a: 'Indexes have real costs: every INSERT/UPDATE/DELETE must update the B-tree, costing write latency proportional to the number of indexes. Storage cost is 10–30% of the data size. The query planner must evaluate each index. Avoid indexes on: (1) columns with very low cardinality (boolean flags, tiny enums) — the planner will prefer a seq scan anyway since a boolean index only halves the table; (2) tables that are write-heavy and read-rarely; (3) columns never used in WHERE, JOIN ON, or ORDER BY; (4) very small tables where a seq scan is always faster than an index lookup.',
  },
  {
    q: 'What is a covering index and when is it useful?',
    a: 'A covering index includes all columns needed to satisfy a query in the index itself, enabling an index-only scan that never touches the main heap (the actual table pages). Example: CREATE INDEX ON orders (user_id) INCLUDE (status, created_at). A query SELECT status, created_at FROM orders WHERE user_id = 42 can be answered entirely from the index. This eliminates the heap fetch (a random I/O per matching row), which is the bottleneck for high-row-count index scans. EXPLAIN will show "Index Only Scan" — look for "Heap Fetches: 0" to confirm the index covers everything.',
  },
  {
    q: 'What is a transaction isolation level and which one should you use by default?',
    a: 'Isolation levels control what a transaction can see from concurrent writes. READ UNCOMMITTED allows dirty reads (uncommitted data from other transactions) — almost never use it. READ COMMITTED (Postgres default) sees only committed data at query time — the right default for most apps. REPEATABLE READ takes a snapshot at transaction start — all reads see the same data. SERIALIZABLE provides full isolation as if transactions ran one after another — required for financial ledgers, inventory systems, or anywhere you\'re doing read-then-write logic (e.g., check balance → deduct). The higher the level, the more chance of serialization errors that require application-level retry.',
  },
  {
    q: 'What is the WAL and why does Postgres write to it before touching data pages?',
    a: 'The Write-Ahead Log (WAL) is an append-only, sequential log file in pg_wal/. Every change is written here before the corresponding data page is modified. Sequential disk writes are ~100× faster than random writes, so the WAL is cheap to write. On crash, Postgres replays WAL from the last checkpoint to restore any data pages that were in memory but not flushed. This guarantees durability: once fsync() on the WAL succeeds and COMMIT returns, the data is safe regardless of what happens to the in-memory page. WAL is also the replication mechanism — standby servers apply the same WAL stream to stay in sync.',
  },
];

const SCENARIO = [
  {
    q: 'A query on a 10M-row orders table takes 4 seconds. EXPLAIN shows a Seq Scan. How do you fix it?',
    a: 'First, identify the WHERE clause columns: SELECT * FROM orders WHERE user_id = 42 AND status = \'pending\'. Run EXPLAIN (ANALYZE, BUFFERS) to see rows, actual time, and buffer hits vs reads. If user_id has high cardinality (many distinct values), add a single-column index: CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id). If queries always filter on both user_id and status, a composite index (user_id, status) is better — leftmost prefix rule means it also covers user_id-only queries. If the query only needs user_id, status, and created_at, add a covering index with INCLUDE(created_at, status) to enable index-only scans. Use CREATE INDEX CONCURRENTLY to avoid locking the table in production.',
  },
  {
    q: 'You have a users table with 50M rows. A new engineer adds five indexes to speed up their queries. What problems might appear?',
    a: 'Five indexes means five B-trees that must be updated on every INSERT, UPDATE, or DELETE. INSERT throughput may drop by 40–70% depending on index size and disk I/O. Autovacuum now has more index pages to process — VACUUM can lag behind, causing table bloat. The query planner has more options to evaluate; for complex queries it may choose a suboptimal plan due to stale statistics. Storage cost increases significantly — on a 50M-row table each index might be 2–5GB. Fix: run pg_stat_user_indexes to identify never-used indexes (idx_scan = 0 after a week), drop unused ones. Use EXPLAIN to confirm the planner uses each index.',
  },
  {
    q: 'Two concurrent transactions both read a user\'s balance ($500), then both try to deduct $400. How does Postgres handle this?',
    a: 'This is a classic lost update / phantom write scenario. With READ COMMITTED (default), both transactions read $500 and both compute $500 - $400 = $100. Both succeed — the final balance is $100, but $800 was effectively withdrawn. Fix option 1: SELECT FOR UPDATE — the second transaction blocks until the first commits, then reads the updated $100 and correctly fails (if balance < $400). Fix option 2: optimistic locking — add a version column, UPDATE ... WHERE version = 5 and check rows_affected = 1; retry if 0. Fix option 3: SERIALIZABLE isolation — Postgres will detect the read-write conflict and abort one transaction with a serialization failure. For financial operations, SELECT FOR UPDATE is the most reliable and common pattern.',
  },
  {
    q: 'You need to add a NOT NULL column to a table with 50M rows in a production Postgres database. How do you do it without downtime?',
    a: 'ALTER TABLE orders ADD COLUMN processed BOOLEAN NOT NULL DEFAULT FALSE takes an AccessExclusiveLock that blocks all reads and writes for the entire table rewrite — potentially minutes on a 50M-row table. Zero-downtime approach: (1) Add the column as nullable with a default: ALTER TABLE orders ADD COLUMN processed BOOLEAN DEFAULT FALSE — in Postgres 11+ with a constant default, this is metadata-only (instant). (2) Backfill in batches with UPDATE orders SET processed = FALSE WHERE processed IS NULL AND id BETWEEN N AND N+10000 to avoid long locks. (3) Add the NOT NULL constraint with NOT VALID: ALTER TABLE orders ADD CONSTRAINT processed_not_null CHECK (processed IS NOT NULL) NOT VALID — doesn\'t scan existing rows. (4) Validate in background: ALTER TABLE orders VALIDATE CONSTRAINT processed_not_null — uses a lighter lock. (5) Finally drop the check and set NOT NULL once backfill is complete.',
  },
];

const TRADEOFFS = [
  {
    q: 'When would you choose a NoSQL database (like MongoDB or DynamoDB) over PostgreSQL?',
    a: 'Choose PostgreSQL when: (1) data has relationships requiring JOINs, (2) ACID transactions are required (payments, inventory), (3) schema is well-understood upfront, (4) reporting and ad-hoc queries matter. Choose a document store (MongoDB) when: (1) data is hierarchical/nested and always accessed as a unit (don\'t need to JOIN), (2) schema evolves rapidly and you want flexibility, (3) you need to store variable-structure documents. Choose DynamoDB when: (1) access patterns are known upfront and simple (key-value lookups), (2) you need guaranteed <10ms latency at any scale without managing infrastructure, (3) you\'re already AWS-native and want zero ops. The wrong choice is using MongoDB to avoid thinking about schema — you\'ll pay for it with inconsistent data and hard-to-query collections.',
  },
  {
    q: 'Read replicas solve read load but introduce lag. What problems does replication lag cause, and how do you mitigate it?',
    a: 'Replication lag means a replica may serve stale data seconds (or minutes) behind the primary. Problems: (1) Read-your-writes consistency — a user creates a post then immediately reads the list; the replica doesn\'t have the new post yet → confusing UX. (2) Stale cache invalidation decisions. (3) Incorrect reporting (revenue dashboard shows lower numbers). Mitigations: (1) Route writes + immediately-subsequent reads to primary. (2) Sticky sessions for a user\'s own writes (session affinity to primary for 5s). (3) Monitor replication lag (pg_stat_replication on primary, pg_last_xact_replay_timestamp() on replica); alert if lag > threshold. (4) For critical reads (payment confirmation), always read from primary. (5) Synchronous replication (synchronous_standby_names) eliminates lag but adds latency to every write — use sparingly.',
  },
  {
    q: 'Your startup is using a single Postgres database. When is the right time to shard, and what should you shard on?',
    a: 'Most startups shard too early. Before sharding: add indexes, tune queries, upgrade to a larger instance (vertical scaling is cheap), add read replicas for read load, use connection pooling (PgBouncer). Shard when: a single instance can\'t handle write load (CPU/disk saturated on primary), or the dataset exceeds what a single machine can store cost-effectively. Shard key principles: (1) pick a key that distributes load evenly (user_id, workspace_id — high cardinality, uniform distribution); (2) ensure most queries are scoped to a single shard (avoid cross-shard JOINs); (3) the key must be present in every related table. What to avoid: time-based sharding (hot shard problem), sharding too early (it\'s operationally complex — migrations, cross-shard transactions, resharding). Notion sharded on workspace_id; Instagram sharded on user_id. Both waited until they had millions of active rows.',
  },
];

export function DbInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['SQL queries', 'indexes', 'ACID transactions']} />

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Conceptual questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Core mechanics — B-trees, ACID, WAL, indexes, and isolation.
        </p>
        <InterviewQA items={CONCEPTUAL} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Scenario questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Production problems: slow queries, concurrency bugs, zero-downtime migrations.
        </p>
        <InterviewQA items={SCENARIO} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Trade-off questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          SQL vs NoSQL, replication lag, and when to shard.
        </p>
        <InterviewQA items={TRADEOFFS} accentColor={COLOR} />
      </div>

      <Callout type="tip" title="The interviewer's real question:">
        Almost every database question is testing whether you understand that indexes have write costs,
        transactions have isolation tradeoffs, and sharding is a last resort.
        Lead with EXPLAIN ANALYZE for query problems, SELECT FOR UPDATE for concurrency, and
        &ldquo;add a read replica first&rdquo; for scale — you&apos;ll stand out from candidates who jump straight to sharding.
      </Callout>
    </div>
  );
}
