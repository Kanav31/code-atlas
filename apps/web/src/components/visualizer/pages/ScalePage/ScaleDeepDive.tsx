import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-scale)';

const BLOG_LINKS = [
  {
    company: 'Netflix',
    logo: 'N',
    color: '#E50914',
    title: 'Hystrix: Circuit Breaker for Distributed Systems',
    description:
      'Netflix\'s engineering post on Hystrix — how they built the circuit breaker pattern to prevent cascading failures across 500+ microservices. When a downstream service starts failing, the circuit opens and short-circuits calls instantly instead of letting threads pile up waiting for timeouts. Used to keep Netflix streaming during partial outages.',
    url: 'https://netflixtechblog.com/making-the-netflix-api-more-resilient-a8ec62159c2d',
    tag: 'Circuit breaker · Resilience · Microservices',
  },
  {
    company: 'Amazon',
    logo: 'A',
    color: '#FF9900',
    title: 'Avoiding Fallback in Distributed Systems',
    description:
      'Amazon\'s deep dive into cell-based architecture — how they shard not just data but entire traffic flows into isolated "cells" so a failure in one cell never affects others. Covers shuffle sharding for noise isolation, how they calculate cell sizes, and why blast radius reduction is more important than raw performance at Amazon\'s scale.',
    url: 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/',
    tag: 'Cell architecture · Blast radius · AWS',
  },
  {
    company: 'Discord',
    logo: 'D',
    color: '#5865F2',
    title: 'How Discord Scaled to 5 Million Concurrent Users',
    description:
      'Discord went from a monolith to a horizontally scaled service handling 5M+ concurrent WebSocket connections — covering their Elixir/Erlang choice for connection handling, how they shard guilds across nodes, their use of Cassandra for message storage, and the specific bottlenecks they hit at each scale milestone.',
    url: 'https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users',
    tag: 'WebSockets · Elixir · Horizontal scaling',
  },
  {
    company: 'Figma',
    logo: 'F',
    color: '#A259FF',
    title: 'How Figma Scaled to Multiple Databases',
    description:
      'Figma outgrew a single Postgres database and needed to shard. This post details their journey: choosing document_id as the shard key, dual-writing during migration, handling cross-shard queries, and the surprisingly difficult challenge of migrating 10TB of data without downtime or data loss. A realistic look at what production sharding actually involves.',
    url: 'https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/',
    tag: 'PostgreSQL sharding · Live migration · 10TB',
  },
  {
    company: 'Cloudflare',
    logo: 'CF',
    color: '#F38020',
    title: 'How We Built Pingora: Replacing NGINX',
    description:
      'Cloudflare built Pingora (in Rust) to replace NGINX as their global load balancer, handling 1 trillion requests per day across 200+ PoPs. Covers their consistent hashing implementation for upstream selection, connection pooling across 35M requests/second, and why the per-connection cost of NGINX\'s process model became unacceptable at their scale.',
    url: 'https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/',
    tag: 'Load balancing · Consistent hashing · Rust',
  },
];

export function ScaleDeepDive() {
  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      <BeginnerWarning prerequisites={['horizontal vs vertical scaling', 'load balancers', 'stateless servers']} />

      {/* Load balancing algorithms */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Load balancing algorithms</h2>
        <div className="space-y-2">
          {[
            { algo: 'Round-robin',       when: 'Requests are similar in duration',         risk: 'One slow server drags down the pool',         use: 'Static assets, uniform APIs' },
            { algo: 'Least connections', when: 'Request duration varies widely',            risk: 'Slightly more routing overhead',               use: 'API servers, DB proxies — safest default' },
            { algo: 'IP hash',           when: 'Need sticky sessions (stateful)',           risk: 'Uneven distribution if clients cluster by IP', use: 'Legacy stateful apps, gaming sessions' },
            { algo: 'Weighted',          when: 'Servers have different capacity',           risk: 'Manual weight tuning needed',                  use: 'Mixed-gen hardware, canary deployments' },
            { algo: 'Least response',    when: 'Minimize tail latency (p99)',               risk: 'More monitoring overhead',                     use: 'Real-time / latency-sensitive APIs' },
          ].map((row) => (
            <div
              key={row.algo}
              className="rounded-lg border px-4 py-3 text-[11px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="font-mono font-semibold" style={{ color: COLOR }}>{row.algo}</span>
                <span className="text-[9px] font-mono text-[var(--muted)] px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--line)' }}>
                  best for: {row.use}
                </span>
              </div>
              <p className="text-[var(--text2)] mb-0.5">→ Use when: {row.when}</p>
              <p className="text-[var(--muted)]">⚠ {row.risk}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CAP Theorem */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">CAP theorem — pick two (really: CP or AP)</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`          Consistency
               /\\
              /  \\
             /    \\
         CP /      \\ CA
           /        \\  ← CA impossible in practice
          /  network \\    (partitions always happen)
         /  partition \\
        /______________\\
   Availability       Partition Tolerance

  CP (consistency + partition tolerance):
    → Block all writes during network partition
    → Wait for consensus before responding
    → Examples: HBase, Zookeeper, Etcd
    → Right for: financial systems, inventory

  AP (availability + partition tolerance):
    → Keep serving requests, accept stale reads
    → Resolve conflicts on merge (eventual consistency)
    → Examples: Cassandra, CouchDB, DynamoDB
    → Right for: social feeds, product catalogs, DNS`}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          The practical choice is between CP and AP — CA is only possible on a single machine with no network.
          Most consumer apps can tolerate eventual consistency (AP). Payment systems need CP.
        </p>
      </div>

      {/* Consistent hashing */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Consistent hashing</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`Hash ring (0 → 360°):

                 0°
          Server-C  Server-A
      270° ─────●──────●───── 90°
                │      │
                ●──────●
          Server-D  Server-B
                180°

  key "user_42"  → hash → 127°  → next server clockwise → Server-B

  Add Server-E at 110°:
  → Only keys between 90° and 110° move (Server-B → Server-E)
  → All other keys unaffected

  Without consistent hashing (naive modulo):
  → Add 1 server to 4 → hash(key) % 5 remaps 80% of keys
  → Cache invalidation stampede, DB overload

  Virtual nodes: each physical server maps to 100+ ring positions
  → Better load distribution with fewer servers`}
        </div>
      </div>

      {/* Vertical vs horizontal comparison */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Scaling comparison matrix</h2>
        <div className="space-y-2">
          {[
            { label: 'Category',       vert: 'Vertical (scale up)',  horiz: 'Horizontal (scale out)', isHeader: true },
            { label: 'Mechanism',      vert: 'Bigger machine',       horiz: 'More machines'           },
            { label: 'Ceiling',        vert: '~128 cores / $50K/mo', horiz: 'Theoretically unlimited' },
            { label: 'Downtime',       vert: 'Yes (instance resize)', horiz: 'None'                   },
            { label: 'Failure',        vert: 'Single point',         horiz: 'Redundant'               },
            { label: 'Cost curve',     vert: 'Exponential after peak', horiz: 'Linear'                },
            { label: 'Complexity',     vert: 'Low — no changes',     horiz: 'High — stateless needed' },
            { label: 'Best for',       vert: 'DB primary, monoliths', horiz: 'App servers, caches'    },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 items-center gap-3 rounded-lg border px-4 py-2.5 text-[11px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <span className="font-semibold font-mono text-[var(--muted)]">{row.label}</span>
              <span className="font-semibold" style={{ color: row.isHeader ? COLOR : 'var(--text2)' }}>{row.vert}</span>
              <span className="text-[var(--text2)]">{row.horiz}</span>
            </div>
          ))}
        </div>
      </div>

      <Callout type="warn" title="Hot shards — the most common sharding mistake:">
        A celebrity user (user_id=1) with 50M followers causes 50M events routed to a single shard.
        Fix: detect hot keys and spread them across a virtual partition (e.g., user_1_shard_0 through user_1_shard_9).
        Or use a separate high-throughput path for known hot keys.
        Low-cardinality shard keys (country, role) guarantee hot shards — always use high-cardinality keys.
      </Callout>

      {/* Big Tech blog links */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech scales in production</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Engineering posts from teams operating at millions of requests per second.
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
        Every scaling story starts with a single overloaded service and ends with the same solution:
        isolate state, make services stateless, route deterministically by key. Netflix, Discord, and Cloudflare
        all hit the same wall at different scales — the architecture looks the same, just with more zeros.
        Master the patterns here and you can reason about any of them.
      </Callout>
    </div>
  );
}
