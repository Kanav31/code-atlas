import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-cache)';

const BLOG_LINKS = [
  {
    company: 'Instagram',
    logo: 'IG',
    color: '#E1306C',
    title: 'Storing Hundreds of Millions of Simple Key-Value Pairs in Redis',
    description:
      'Instagram\'s engineering post on using Redis to cache 300 million photo IDs with their media server mappings. Covers their decision to use Redis hash data structures (instead of individual keys) to reduce memory overhead by 10×, their encoding tweaks, and how they achieved sub-millisecond lookups at 300M+ keys without an external database call.',
    url: 'https://instagram-engineering.com/storing-hundreds-of-millions-of-simple-key-value-pairs-in-redis-1091ae80f74c',
    tag: 'Redis · Memory optimization · 300M keys',
  },
  {
    company: 'Twitter',
    logo: 'X',
    color: '#000000',
    title: 'Caching at Twitter: Timeline Cache',
    description:
      'How Twitter caches home timelines in Redis — each user\'s timeline is a sorted set of tweet IDs (not full tweet objects). On read, Twitter fans out: fetch IDs from Redis (~1ms), then batch-fetch tweet objects from a secondary cache. Covers their write fanout model (push vs pull), why celebrity tweets are handled differently, and their cache warming strategy after deploys.',
    url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/',
    tag: 'Timeline · Fanout · Redis sorted sets',
  },
  {
    company: 'Slack',
    logo: 'S',
    color: '#4A154B',
    title: 'Caching at Slack — A Brief History',
    description:
      'Slack\'s progression from Memcached to a layered cache architecture as they scaled to millions of teams. Covers their cache-aside pattern, how they handle cache invalidation across data center regions, their approach to thundering herd with probabilistic early expiration, and why they eventually added a local L1 in-process cache in front of Redis for the hottest keys.',
    url: 'https://slack.engineering/caching-at-slack/',
    tag: 'Multi-layer cache · Thundering herd · Invalidation',
  },
  {
    company: 'Cloudflare',
    logo: 'CF',
    color: '#F38020',
    title: 'How Cloudflare\'s Cache Works',
    description:
      'Cloudflare serves 35 million HTTP requests per second from 300+ PoPs worldwide — almost entirely from cache. This post covers their tiered cache architecture (edge → regional → origin), their cache key normalization to maximize hit rate, how they handle cache purges propagating to 300 locations in <150ms, and their implementation of stale-while-revalidate at CDN scale.',
    url: 'https://blog.cloudflare.com/introducing-smarter-tiered-cache-topology-generation/',
    tag: 'CDN · Tiered cache · 35M rps',
  },
  {
    company: 'DoorDash',
    logo: 'DD',
    color: '#FF3008',
    title: 'How DoorDash Standardized and Improved Microservices Caching',
    description:
      'DoorDash built a caching abstraction layer across 400+ microservices to standardize TTL policies, hit rate monitoring, and cache invalidation. Covers their decision to use a read-through cache wrapper (instead of ad-hoc cache-aside everywhere), how they measure and alert on hit rate drops, and their approach to cache warming during service deploys to prevent cold-start stampedes.',
    url: 'https://doordash.engineering/2023/10/19/how-doordash-standardized-and-improved-microservices-caching/',
    tag: 'Cache abstraction · Hit rate monitoring · 400+ services',
  },
];

export function CacheDeepDive() {
  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      <BeginnerWarning prerequisites={['cache hits and misses', 'TTL (time-to-live)', 'cache eviction policies']} />

      {/* Hit rate math */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Cache hit rate — the math that matters</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`  hit rate = cache_hits / total_requests

  Example: 1,000 req/s  ·  95% hit rate
  ├─ 950 served from Redis    ~1ms   each
  └─  50 fetched from DB     ~50ms  each

  avg latency = 0.95 × 1ms + 0.05 × 50ms = 3.45ms
  Without cache:              avg = 50ms   (14.5× slower)
  DB queries/s: 50  (vs 1,000 without cache = 95% reduction)

  Impact on DB connection pool:
  ┌──────────────────┬─────────┬──────────────┐
  │                  │ No cache│ 95% hit rate │
  ├──────────────────┼─────────┼──────────────┤
  │ DB queries/s     │  1,000  │      50      │
  │ Avg latency      │   50ms  │    3.45ms    │
  │ p99 latency      │  300ms  │     ~5ms     │
  │ DB connections   │   100+  │       5      │
  └──────────────────┴─────────┴──────────────┘

  Rule of thumb: target > 90% hit rate.
  Below 80% = cache is adding complexity without benefit.
  Monitor: cache_hit_rate, cache_miss_rate, evictions/s`}
        </div>
      </div>

      {/* Write strategies */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Write strategies compared</h2>
        <div className="space-y-2">
          {[
            {
              name: 'Cache-aside (read)',
              flow: 'Check cache → miss → query DB → cache result → return',
              pros: 'Simple. App controls what gets cached. Cache only holds what\'s been read.',
              cons: 'First request always slow (cold miss). Cache can be stale until TTL expires.',
              when: 'Default for most read-heavy apps',
            },
            {
              name: 'Write-through',
              flow: 'Write to cache AND DB synchronously on every write',
              pros: 'Cache always consistent with DB. No stale reads after writes.',
              cons: 'Higher write latency (two writes). Cache fills with data that may never be read.',
              when: 'Financial data, inventory counts, anything requiring immediate consistency',
            },
            {
              name: 'Write-back (write-behind)',
              flow: 'Write to cache only → flush to DB asynchronously in background',
              pros: 'Fastest writes — only one synchronous write. Absorbs write bursts.',
              cons: 'Data loss if cache crashes before flush. Complex failure handling.',
              when: 'High-write workloads where small data loss is acceptable (analytics counters)',
            },
            {
              name: 'Read-through',
              flow: 'Cache sits in front of DB. Cache fetches from DB on miss automatically.',
              pros: 'Application doesn\'t need to know about cache. Clean abstraction.',
              cons: 'Cache library must support it. Less flexible than cache-aside.',
              when: 'When you want a caching layer that\'s transparent to application code',
            },
          ].map((row) => (
            <div
              key={row.name}
              className="rounded-lg border px-4 py-3 text-[11px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono font-semibold" style={{ color: COLOR }}>{row.name}</span>
                <span className="text-[9px] font-mono text-[var(--muted)] px-2 py-0.5 rounded-full border border-[var(--line)]">{row.when}</span>
              </div>
              <p className="text-[var(--muted)] font-mono text-[10px] mb-1.5">→ {row.flow}</p>
              <p className="text-[var(--text2)] mb-0.5">✓ {row.pros}</p>
              <p className="text-[var(--muted)]">⚠ {row.cons}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Redis data structures */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Redis data structures</h2>
        <div className="space-y-2">
          {[
            { type: 'String',      cmd: 'SET user:1 "{...}"  EX 60',         use: 'Simple key-value, counters, sessions, rate limit tokens' },
            { type: 'Hash',        cmd: 'HSET user:1 name Alice age 30',      use: 'Object with fields — partial updates without fetching full object' },
            { type: 'Sorted Set',  cmd: 'ZADD leaderboard 1500 "alice"',      use: 'Leaderboards, rate limiting windows, priority queues' },
            { type: 'List',        cmd: 'LPUSH feed:42 event1 event2',        use: 'Activity feeds, job queues, recent items (capped with LTRIM)' },
            { type: 'Set',         cmd: 'SADD online_users "user:42"',        use: 'Unique visitors, tags, mutual friends, bloom filter alternative' },
            { type: 'Bitmap',      cmd: 'SETBIT daily_active 42 1',           use: 'Compact boolean flags — 1 bit per user, 125MB for 1B users' },
            { type: 'HyperLogLog', cmd: 'PFADD unique_visitors "ip1"',        use: 'Approximate unique counts with < 1% error, ~12KB regardless of cardinality' },
          ].map((item) => (
            <div
              key={item.type}
              className="flex items-start gap-3 bg-[var(--bg2)] border border-[var(--line)] rounded-lg px-4 py-3"
            >
              <span className="text-[11px] font-semibold w-24 flex-shrink-0 mt-0.5 font-mono" style={{ color: COLOR }}>{item.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-[var(--muted)] mb-1">{item.cmd}</p>
                <p className="text-[11px] text-[var(--text2)]">{item.use}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thundering herd */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Cache stampede — and how to prevent it</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`Problem:
  t=60s: popular key "home_feed" TTL expires
  t=60s: 500 requests simultaneously check cache → all MISS
  t=60s: all 500 hit the DB simultaneously → DB overwhelmed

Solutions:

  1. Mutex lock (Redis SETNX)
     SETNX lock:home_feed 1 EX 5
     → only 1 request fetches, others wait/retry
     → simpler but adds latency for waiters

  2. Probabilistic early expiration
     refresh_time = ttl * random(0.8, 0.95)
     → each instance independently considers early refresh
     → background refresh before expiry with jitter
     → no hard coordination needed

  3. Stale-while-revalidate
     → serve stale data immediately
     → one goroutine refreshes in background
     → zero added latency for clients
     → standard in CDNs (Cache-Control: stale-while-revalidate=30)

  4. Request coalescing
     → hold duplicate in-flight requests
     → first completes → fan out result to all waiters
     → used in Nginx, Varnish, Cloudflare Workers`}
        </div>
      </div>

      <Callout type="warn" title="Cache invalidation is the hardest problem:">
        &ldquo;There are only two hard things in Computer Science: cache invalidation and naming things.&rdquo; — Phil Karlton.
        When the underlying data changes, every cache entry that depends on it must be invalidated or updated.
        Common bugs: invalidating by key pattern (dangerous with large keyspaces), forgetting secondary cache layers,
        race conditions between write and invalidation. Simplest fix: short TTLs. Correct fix: event-driven invalidation
        (publish change event → consumers delete their cache keys).
      </Callout>

      {/* Big Tech blog links */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech uses caching at scale</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Engineering posts from teams running Redis and CDN caches at billions-of-requests scale.
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
                style={{ background: link.color, color: link.color === '#000000' || link.color === '#4A154B' ? '#fff' : '#fff' }}
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
                    style={{ color: link.color === '#000000' ? '#888' : link.color, background: `color-mix(in srgb, ${link.color === '#000000' ? '#888' : link.color} 12%, transparent)` }}
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
        Every team above uses a layered cache strategy: L1 in-process (nanoseconds) → L2 Redis cluster (microseconds)
        → L3 CDN edge (milliseconds from user) → origin DB (last resort). They all measure hit rate obsessively
        and treat a drop below 90% as an incident. The cache layer is as critical as the database — monitor it accordingly.
      </Callout>
    </div>
  );
}
