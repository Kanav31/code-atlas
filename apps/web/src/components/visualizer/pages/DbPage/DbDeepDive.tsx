import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-db)';

const BLOG_LINKS = [
  {
    company: 'Instagram',
    logo: 'IG',
    color: '#E1306C',
    title: 'Sharding & IDs at Instagram',
    description:
      'How Instagram moved from a single Postgres instance to a sharded architecture handling billions of rows — covering their ID generation scheme (no UUID!), shard-key selection, and why they avoided cross-shard joins at the application layer.',
    url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c',
    tag: 'Sharding · ID generation · PostgreSQL',
  },
  {
    company: 'GitHub',
    logo: 'GH',
    color: '#238636',
    title: 'How GitHub Migrated MySQL to Vitess',
    description:
      'GitHub ran MySQL for years but hit limits around schema migrations on 300GB+ tables and connection pooling. This post covers their migration to Vitess for horizontal sharding, zero-downtime schema changes, and how they handled the transition without downtime.',
    url: 'https://github.blog/engineering/infrastructure/scaling-git-from-a-single-server-to-a-distributed-system/',
    tag: 'MySQL · Vitess · Zero-downtime migrations',
  },
  {
    company: 'Notion',
    logo: 'N',
    color: '#ffffff',
    title: 'Herding Elephants: Lessons Learned from Sharding Notion\'s Postgres',
    description:
      'Notion ran a single Postgres database until it became a bottleneck. This detailed post covers how they picked their shard key (workspace_id), migrated 8TB of data online using dual-write, and the index strategy that made their most common queries fast post-shard.',
    url: 'https://www.notion.so/blog/sharding-postgres-at-notion',
    tag: 'PostgreSQL · Sharding · Live migration',
  },
  {
    company: 'Stripe',
    logo: 'S',
    color: '#635BFF',
    title: 'Idempotency Keys and How Stripe Uses Them',
    description:
      'Stripe\'s deep dive into idempotency — why financial APIs need it, how they store idempotency keys in Postgres with a unique constraint + ACID transaction, and what happens when two requests with the same key race. The canonical reference for at-most-once payment semantics.',
    url: 'https://stripe.com/blog/idempotency',
    tag: 'ACID · Idempotency · Payments',
  },
  {
    company: 'Cloudflare',
    logo: 'CF',
    color: '#F38020',
    title: 'SQLite at the Edge: How D1 Works',
    description:
      'Cloudflare runs SQLite — yes, SQLite — on their edge workers for D1, their globally distributed database. Covers how they replicate SQLite WAL across 300+ PoPs, handle consistency guarantees without a central coordinator, and why SQLite\'s simplicity is a feature at the edge.',
    url: 'https://blog.cloudflare.com/introducing-d1/',
    tag: 'SQLite · WAL · Edge computing',
  },
];

export function DbDeepDive() {
  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      <BeginnerWarning prerequisites={['SQL queries', 'indexes', 'ACID transactions']} />

      {/* B-tree structure */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">B-tree anatomy</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`B-tree on users.id  (replication factor = 3 entries per node, simplified)

                     [root]
                   ┌──500──┐
                   │       │
              [250]         [750]
            ┌──┴──┐       ┌──┴──┐
         [125]  [375]  [625]  [875]
           │      │      │      │
       leaf pages (actual row pointers)
       [40,41,42] [376,377] [626] ...

  Height = 3 for ~1M rows → 3 page reads
  Height = 4 for ~1B rows → 4 page reads

  Each page = 8KB  (Postgres default block_size)
  Internal nodes cached in shared_buffers → often 0 disk I/O
  Leaf pages: one read per matching row`}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          B-trees stay balanced via page splits (when a leaf is full, it splits and promotes a key to the parent).
          VACUUM reclaims space from deleted rows. <strong className="text-[var(--text2)]">REINDEX</strong> rebuilds
          a bloated index without locking the table (Postgres 12+).
        </p>
      </div>

      {/* Index types */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Index types in PostgreSQL</h2>
        <div className="space-y-2">
          {[
            { type: 'B-tree',    ops: '=, <, >, BETWEEN, LIKE foo%',    use: 'Default. Almost everything.',              warn: '' },
            { type: 'Hash',      ops: '= only',                          use: 'Equality-only, faster than B-tree for =', warn: 'Not WAL-logged pre-PG10' },
            { type: 'GIN',       ops: '@>, @@, jsonb containment',       use: 'JSONB columns, full-text search arrays',   warn: 'Slow to build/update' },
            { type: 'GiST',      ops: 'Geometry, ranges, full-text',     use: 'PostGIS, range types, tsvector',           warn: 'Application-specific' },
            { type: 'BRIN',      ops: '=, range on physically sorted',   use: 'Time-series, append-only tables',         warn: '~128 rows granularity' },
            { type: 'Partial',   ops: 'Any (with WHERE clause)',          use: 'WHERE deleted_at IS NULL — index subset', warn: '' },
            { type: 'Covering',  ops: 'INCLUDE extra columns',            use: 'Index-only scans (avoid heap fetch)',      warn: 'Larger index size' },
          ].map((row) => (
            <div
              key={row.type}
              className="grid gap-3 rounded-lg border px-4 py-2.5 text-[11px]"
              style={{ gridTemplateColumns: '90px 1fr 1fr', background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <span className="font-mono font-semibold" style={{ color: COLOR }}>{row.type}</span>
              <span className="text-[var(--text2)]">{row.ops}</span>
              <span className="text-[var(--muted)]">{row.use}{row.warn ? ` · ⚠ ${row.warn}` : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WAL */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Write-Ahead Log (WAL)</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`Every write goes to WAL BEFORE touching the actual data page:

  1. Client:   UPDATE accounts SET balance = 900 WHERE id = 1
  2. Postgres: Write WAL record → pg_wal/000001 (append-only, sequential I/O)
  3. Postgres: Modify data page in shared_buffers (in memory)
  4. Client:   Receives COMMIT (WAL is on disk — durability guaranteed)
  5. Bgwriter: Eventually flushes dirty pages to data files

  Crash at step 3?
  → On restart, WAL replays from last checkpoint
  → Data pages restored to consistent state
  → No data loss for committed transactions

  WAL is also the source of logical replication:
  → pg_logical_slot reads WAL → publishes row-level changes
  → Used by Debezium, read replicas, Supabase realtime`}
        </div>
      </div>

      {/* ACID + Isolation levels */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Isolation levels vs anomalies</h2>
        <div className="space-y-2">
          {[
            { level: 'READ UNCOMMITTED', dirty: '✗ yes', nonrep: '✗ yes', phantom: '✗ yes', notes: 'Allows dirty reads — practically never use' },
            { level: 'READ COMMITTED',   dirty: '✓ no',  nonrep: '✗ yes', phantom: '✗ yes', notes: 'Postgres default — sees committed data only' },
            { level: 'REPEATABLE READ',  dirty: '✓ no',  nonrep: '✓ no',  phantom: '✗ yes', notes: 'Consistent snapshot; Postgres prevents phantoms too' },
            { level: 'SERIALIZABLE',     dirty: '✓ no',  nonrep: '✓ no',  phantom: '✓ no',  notes: 'Full isolation. Slowest — may abort/retry txns' },
          ].map((row, i) => (
            <div
              key={row.level}
              className="grid gap-3 rounded-lg border px-4 py-2.5 text-[11px]"
              style={{ gridTemplateColumns: '160px 70px 70px 70px 1fr', background: i === 1 ? `color-mix(in srgb, ${COLOR} 5%, var(--bg2))` : 'var(--bg2)', borderColor: i === 1 ? `color-mix(in srgb, ${COLOR} 25%, var(--line))` : 'var(--line)' }}
            >
              <span className="font-mono font-semibold" style={{ color: i === 1 ? COLOR : 'var(--text2)' }}>{row.level}</span>
              <span className={row.dirty === '✓ no' ? 'text-emerald-400' : 'text-red-400'}>{row.dirty}</span>
              <span className={row.nonrep === '✓ no' ? 'text-emerald-400' : 'text-red-400'}>{row.nonrep}</span>
              <span className={row.phantom === '✓ no' ? 'text-emerald-400' : 'text-red-400'}>{row.phantom}</span>
              <span className="text-[var(--muted)]">{row.notes}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {['Dirty read', 'Non-repeatable read', 'Phantom read'].map((h) => (
            <span key={h} className="text-[9px] font-mono text-[var(--muted)] text-center">{h}</span>
          ))}
        </div>
      </div>

      <Callout type="warn" title="N+1 query — the silent killer:">
        The most common performance bug: load 100 users, then for each user run a query for their posts.
        That&apos;s 101 queries. Fix: <strong className="text-[var(--text)]">JOIN</strong> at the SQL level, or use&nbsp;
        <strong className="text-[var(--text)]">SELECT IN (...)</strong> for IDs, or a dataloader pattern (batching).
        EXPLAIN ANALYZE will show &ldquo;loops=100&rdquo; on the inner node — that&apos;s your smoking gun.
      </Callout>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Diagnosing slow queries — the two commands you need</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`-- See the query plan and actual execution stats
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at > NOW() - INTERVAL '7 days';

-- Look for:
-- Seq Scan on large table  → add index
-- rows=10000 actual=1      → stale stats, run: ANALYZE orders;
-- loops=500                → N+1, use JOIN instead
-- Buffers: hit=X read=Y   → high read = working set > shared_buffers

-- Find missing indexes (queries doing expensive seq scans)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'user_id';`}
        </div>
      </div>

      {/* Big Tech blog links */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech handles databases at scale</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Engineering posts from teams running Postgres, MySQL, and SQLite at billions-of-rows scale.
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
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                style={{ background: link.color, color: link.color === '#ffffff' ? '#000' : '#fff' }}
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
                    style={{ color: link.color === '#ffffff' ? '#aaa' : link.color, background: `color-mix(in srgb, ${link.color === '#ffffff' ? '#888' : link.color} 12%, transparent)` }}
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
        Every scaling story follows the same arc: single Postgres → read replicas → connection pooling (PgBouncer) →
        vertical scaling ceiling → sharding by a business key (user_id, workspace_id). The shard key choice is
        irreversible — pick one that keeps related data co-located and avoids cross-shard joins.
      </Callout>
    </div>
  );
}
