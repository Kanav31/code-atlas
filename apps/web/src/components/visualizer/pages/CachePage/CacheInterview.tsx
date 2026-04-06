import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-cache)';

const CONCEPTUAL = [
  {
    q: 'What is a cache eviction policy and what are the main types?',
    a: 'An eviction policy determines which cached entries are removed when the cache is full. LRU (Least Recently Used): evicts the entry not accessed for the longest time — exploits temporal locality, the assumption that recently used data will be used again. LFU (Least Frequently Used): evicts the entry accessed the fewest times — better for workloads with stable hot data but expensive to track accurately. FIFO: evicts the oldest entry regardless of access — simple but ignores access patterns. TTL-based: entries expire after a fixed time — pairs with any eviction policy. Redis supports: allkeys-lru, volatile-lru (only TTL keys), allkeys-random, volatile-ttl (evict nearest-to-expiry), noeviction (returns error when full). Wrong policy causes thrashing or serving stale data.',
  },
  {
    q: 'What is the difference between write-through, write-back, and cache-aside?',
    a: 'Cache-aside (lazy loading): the application checks cache → miss → fetches from DB → stores in cache → returns. App controls caching logic. Cache only holds what\'s been read. Stale on write unless invalidated. Write-through: every write goes to cache AND DB synchronously. Cache is always consistent with DB. Higher write latency. Cache fills with data that may never be read (cold reads). Write-back (write-behind): write to cache only, flush to DB asynchronously. Fastest writes. Risk: if cache crashes before flush, data is lost. Complex failure handling needed. Right choice: cache-aside is the default for most apps. Write-through for financial or inventory data where reads immediately after writes must be fresh. Write-back only when write volume is extremely high and small data loss is acceptable.',
  },
  {
    q: 'What is a cache stampede and how do you prevent it?',
    a: 'Cache stampede (thundering herd) occurs when a popular cached key expires and hundreds or thousands of concurrent requests simultaneously find a cache miss — all hitting the database at the same moment. Prevention strategies: (1) Mutex lock — use Redis SETNX to ensure only one request fetches and populates the cache; others wait and retry. Adds latency for waiters. (2) Probabilistic early expiration — each request independently calculates whether to refresh before TTL expires using random jitter. No coordination needed. (3) Stale-while-revalidate — serve the stale cached value immediately while one background goroutine refreshes it. Zero added latency. (4) Request coalescing — deduplicate in-flight requests so all concurrent misses share one DB fetch. Used internally in NGINX and CDNs.',
  },
  {
    q: 'What is cache coherence and how do you handle cache invalidation in a distributed system?',
    a: 'Cache coherence means ensuring cached data stays consistent with the source of truth when the source changes. In a single-server system, you invalidate or update the cache key on every write. In a distributed system with multiple cache nodes or multiple app servers each with local caches, this is harder: (1) Event-driven invalidation — publish a change event (e.g., to Kafka or Redis pub/sub), all subscribers delete their cached key. This is the most reliable approach. (2) Short TTL — let staleness expire naturally. Simple but means reads can be stale for TTL duration. (3) Version-tagged keys — cache key includes a version (user:42:v5), write increments the version. Old versions become unreachable and expire naturally. (4) Write-through — invalidation is built in since every write updates the cache. The hardest bugs come from forgetting secondary caches — an invalidation that clears the Redis key but not the in-process L1 cache.',
  },
  {
    q: 'When should you NOT cache data?',
    a: 'Avoid caching: (1) Data that changes every request (real-time stock prices, live sports scores) — the cache hit rate would be near 0%, adding latency with no benefit. (2) Highly personalized data with too many unique variants (e.g., a recommendation list unique to each user at each moment) — you\'d cache millions of entries each used once, causing cache pollution and eviction of actually-hot data. (3) Sensitive data (passwords, private keys, PII) — a cache bug could expose it to the wrong user. (4) Data that\'s trivial to recompute (e.g., `username.toLowerCase()`) — the caching overhead exceeds the computation cost. (5) Writes that must be immediately consistent across all readers — unless you use write-through and can guarantee all cache instances are invalidated instantly.',
  },
  {
    q: 'What is the difference between a distributed cache and a local (in-process) cache?',
    a: 'Local (in-process) cache: stored in the application\'s own memory (e.g., a hashmap or Guava Cache). Sub-millisecond access (~100ns). Not shared between service instances — each pod has its own copy. Lost on restart. Cache size limited by JVM/process heap. Use for: hot static data, expensive computations that are the same for all users. Distributed cache (Redis, Memcached): external service shared across all instances. Microsecond access (~0.5ms over network). Shared state across all pods. Survives individual restarts. Can be clustered for large datasets. Use for: session data, per-user data, anything that needs to be shared. Best practice: L1 local cache for the hottest ~1% of keys (nanosecond access), L2 Redis for the rest (microsecond access). Instagram does exactly this — local cache in front of Redis for the top photo IDs.',
  },
];

const SCENARIO = [
  {
    q: 'A product detail page is slow (800ms). EXPLAIN shows the DB query is fast (10ms). Where is the bottleneck and how do you fix it?',
    a: 'The query is fast but the page is slow — the bottleneck is likely N+1 queries or missing caching at the application layer. Diagnosis: enable query logging and count queries per page request. If you see 50 queries for one page load, that\'s the N+1 problem (load product, then load each variant, then load each image separately). Fixes: (1) Cache the full assembled product object in Redis: key = product:{id}, value = full JSON response, TTL = 5 minutes. Cache hit goes from 10ms (one DB query) to 0.5ms (one Redis lookup). (2) Fix N+1: use JOINs or batch queries to load product + variants + images in 2-3 queries instead of 50. (3) If variants change infrequently, cache variant lists separately with a longer TTL. After caching, instrument: if cache hit rate is below 80%, the cache key is too granular or TTL too short.',
  },
  {
    q: 'You deploy a new version of your service and cache hit rate drops to 20% for 5 minutes. What happened and how do you prevent it?',
    a: 'This is a cold cache problem — the new instances start with empty caches (or the deploy flushed the cache). All requests miss and hit the DB simultaneously — a deployment-triggered stampede. Prevention: (1) Cache warming — before sending traffic to new instances, prefetch the most popular keys from a known-popular list (or replay recent cache misses). (2) Blue-green deploy with cache sharing — new instances connect to the same Redis cluster as old instances, so they inherit the warmed cache. (3) Never flush the shared Redis cache on deploy — only flush if the cache schema changed (key format changed). (4) Stagger the rollout — route 5% of traffic to new instances first, let their cache warm naturally before switching fully. DoorDash documents exactly this problem and their cache warming solution.',
  },
  {
    q: 'A user updates their profile picture. 5 minutes later they still see the old picture. Cache is involved. What is wrong?',
    a: 'Classic cache invalidation bug — the profile picture URL is cached but the cache entry wasn\'t invalidated or updated when the picture changed. Investigation: (1) Is the cache key `user:{id}:avatar` or `user:{id}` (full object)? Check if the write path calls cache invalidation after the DB update. (2) Is there a second cache layer? (CDN caching the image URL, in-process L1 cache in addition to Redis). Both need to be invalidated. Fix: (1) Write-through — update cache when updating DB. (2) Event-driven invalidation — publish a UserUpdated event, subscriber deletes `user:{id}` from Redis. (3) If it\'s a CDN issue — the image URL must change (cache-busting via URL versioning: `/avatar/v2.jpg` instead of `/avatar.jpg`). (4) Purge the CDN cache for the specific URL after upload. The root cause is almost always: the invalidation path is missing, partial, or only invalidates one of multiple cache layers.',
  },
  {
    q: 'Your Redis instance is running at 90% memory. What are your options?',
    a: '(1) Identify what\'s using memory: redis-cli MEMORY USAGE key, redis-cli --bigkeys to find the largest keys. Often a few large sorted sets or lists are the culprits — trim them (LTRIM, ZREMRANGEBYRANK). (2) Set maxmemory-policy to allkeys-lru if not already set — Redis will evict least-recently-used keys automatically instead of returning OOM errors. (3) Reduce TTLs on non-critical data. Keys without TTL never expire and accumulate forever — scan for keys without TTL and add them. (4) Compress values — JSON strings compress 60-70% with gzip; for very hot keys, serializing with MessagePack saves 30-40% vs JSON. Instagram stored hashes instead of individual string keys and saved 10× memory. (5) Scale Redis horizontally — Redis Cluster shards data across nodes. Each node holds a subset. Transparent to clients using a cluster-aware client library. (6) Add a local in-process L1 cache for the top 1% of keys — those never hit Redis and reduce its load.',
  },
];

const TRADEOFFS = [
  {
    q: 'Write-through vs cache-aside — which should be your default and why?',
    a: 'Cache-aside should be the default for most web applications. Reasons: (1) Only data that\'s actually been read gets cached — no wasted memory on written-but-never-read data. (2) Simpler code path — the write path doesn\'t need to know about the cache at all. (3) Cache failure doesn\'t block writes — if Redis is down, writes still succeed; reads fall through to DB. Write-through is better when: (1) You must guarantee reads immediately after writes are fresh (e.g., payment confirmation page must show the updated balance). (2) You write infrequently but read the same data heavily right after writing. The tradeoff: write-through adds latency to every write (two network hops). If Redis is down, writes fail or you must implement a fallback. Write-through works best when paired with a Redis cluster with high availability (sentinel or cluster mode).',
  },
  {
    q: 'Redis vs Memcached — when would you choose each?',
    a: 'Choose Redis when: (1) You need data structures beyond key-value (sorted sets for leaderboards, lists for feeds, sets for unique tracking). (2) You need persistence — Redis can snapshot to disk (RDB) or journal all writes (AOF). (3) You need pub/sub messaging. (4) You need Lua scripting for atomic multi-key operations. (5) You need clustering and replication built-in. Choose Memcached when: (1) You only need simple key-value storage. (2) You want multi-threaded performance — Memcached is multi-threaded, Redis is single-threaded per core (though Redis 6+ supports threading for network I/O). (3) Memory efficiency is critical — Memcached has slightly lower per-key overhead for simple string values. In practice: Redis has won. Memcached has few advantages that Redis doesn\'t also provide. New systems should default to Redis.',
  },
  {
    q: 'Is a 99% cache hit rate always good? What are the risks of caching too aggressively?',
    a: 'A 99% hit rate sounds great but can hide problems: (1) Serving dangerously stale data — if TTL is too long and the underlying data changed (price, inventory, user permissions), users see incorrect data. 99% hit rate on a price cache with 1-hour TTL during a flash sale means 60 minutes of wrong prices. (2) Security risk — cached authorization decisions (is user admin?) can be stale if permissions changed. Always use short TTLs or explicit invalidation for security-sensitive data. (3) Cache pollution — caching low-frequency data evicts high-frequency data. A "99% hit rate" on a cache with poor key design can mean you\'re caching 10,000 unique keys each accessed once, while your 10 hot keys keep getting evicted. (4) Over-caching writes — write-through with 99% hit rate means every write touches both cache and DB; you\'ve added latency to all writes for no benefit if reads don\'t follow. Right question: hit rate on your top 100 most-requested keys, not overall hit rate.',
  },
];

export function CacheInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['cache hits and misses', 'TTL (time-to-live)', 'cache eviction policies']} />

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Conceptual questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Core mechanics — eviction policies, write strategies, stampedes, and invalidation.
        </p>
        <InterviewQA items={CONCEPTUAL} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Scenario questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Real debugging scenarios: slow pages, cold deploys, stale pictures, memory pressure.
        </p>
        <InterviewQA items={SCENARIO} accentColor={COLOR} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">Trade-off questions</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Write-through vs cache-aside, Redis vs Memcached, and when high hit rate is a problem.
        </p>
        <InterviewQA items={TRADEOFFS} accentColor={COLOR} />
      </div>

      <Callout type="tip" title="The interviewer's real question:">
        Every cache question is testing whether you understand that caching trades consistency for speed.
        Lead every answer by stating what you&apos;re trading away — &ldquo;this approach means reads can be up to N seconds stale&rdquo;.
        Candidates who can articulate the staleness window, the invalidation strategy, and the cache miss fallback
        path stand out. Anyone can say &ldquo;add a cache&rdquo; — few can say exactly when it goes wrong.
      </Callout>
    </div>
  );
}
