import { Callout } from '@/components/visualizer/shared/Callout';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-rt)';

const BLOG_LINKS = [
  {
    company: 'Discord',
    logo: 'D',
    color: '#5865F2',
    title: 'How Discord Scaled Elixir to 5,000,000 Concurrent Users',
    description: 'How Discord rebuilt their real-time messaging layer using Elixir + Phoenix channels to handle 5M concurrent WebSocket connections on a fraction of the servers.',
    url: 'https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users',
    tag: 'WebSocket · Elixir · Scale',
  },
  {
    company: 'Figma',
    logo: 'F',
    color: '#A259FF',
    title: "How Figma's Multiplayer Technology Works",
    description: "Figma's deep-dive into Operational Transformation over WebSockets — how two users can edit the same node simultaneously without conflicts, with optimistic local updates.",
    url: 'https://www.figma.com/blog/how-figmas-multiplayer-technology-works/',
    tag: 'WebSocket · OT · Collaboration',
  },
  {
    company: 'Slack',
    logo: 'S',
    color: '#4A154B',
    title: 'Real-Time Messaging at Slack',
    description: "Slack's engineering team explains how they moved from polling to a persistent WebSocket gateway, managing millions of connections with pub/sub fan-out across server clusters.",
    url: 'https://slack.engineering/real-time-messaging/',
    tag: 'WebSocket · Pub/Sub · Fan-out',
  },
  {
    company: 'LinkedIn',
    logo: 'in',
    color: '#0A66C2',
    title: 'Instant Messaging at LinkedIn — Scaling to Hundreds of Thousands',
    description: "LinkedIn's shift from HTTP long polling to a persistent connection model for instant messaging, covering connection pooling, presence, and delivery guarantees.",
    url: 'https://engineering.linkedin.com/blog/2016/10/instant-messaging-at-linkedin--scaling-to-hundreds-of-thousands',
    tag: 'Long Polling → WebSocket · Presence',
  },
  {
    company: 'Ably',
    logo: 'A',
    color: '#FF5416',
    title: 'WebSockets — A Conceptual Deep Dive',
    description: "The most comprehensive public reference on WebSocket internals — framing, opcodes, masking, handshake math, heartbeats, and what happens when the connection drops.",
    url: 'https://ably.com/topic/websockets',
    tag: 'Reference · Framing · Protocol',
  },
];

export function RtDeepDive() {
  return (
    <div className="px-8 py-6 space-y-8 content-zone">
      <BeginnerWarning prerequisites={['HTTP request/response cycle', 'TCP connection', 'full-duplex communication']} />

      {/* WebSocket handshake */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">WebSocket handshake</h2>
        <div
          className="rounded-lg border p-4 font-mono text-xs text-[var(--text2)] whitespace-pre leading-relaxed overflow-x-auto"
          style={{ background: 'var(--bg1)', borderColor: 'var(--line)' }}
        >
{`Client → Server
  GET /chat HTTP/1.1
  Host: ws.example.com
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
  Sec-WebSocket-Version: 13

Server → Client
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

  [HTTP is now WebSocket — full-duplex TCP tunnel]`}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          The <code className="font-mono" style={{ color: COLOR }}>Sec-WebSocket-Accept</code> value is the SHA-1 hash of the client's key concatenated with the fixed GUID <code className="font-mono text-[10px]">258EAFA5-E914-47DA-95CA-C5AB0DC85B11</code>, base64-encoded. This prevents accidental WebSocket connections from non-WS clients.
        </p>
      </div>

      {/* Frame overhead comparison */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Per-message overhead</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: 'HTTP/1.1 request',
              color: '#f87171',
              badge: '~500B headers',
              lines: [
                'POST /messages HTTP/1.1',
                'Host: api.example.com',
                'Content-Type: application/json',
                'Authorization: Bearer eyJ...',
                'Cookie: session=abc123...',
                '',
                '{"text":"hi"}  // 14B of actual data',
                '// ~97% is repeated header overhead',
              ],
            },
            {
              label: 'WebSocket frame',
              color: 'var(--c-api)',
              badge: '2B header',
              lines: [
                '// Frame header (2 bytes):',
                '// FIN=1, opcode=0x1 (text)',
                '// MASK=1, payload_len=2',
                '',
                '// Masked payload:',
                '0x68 0x69  // "hi" (2 bytes)',
                '',
                '// Total: 4 bytes for "hi"',
                '// vs ~514B via HTTP',
              ],
            },
          ].map((col) => (
            <div
              key={col.label}
              className="rounded-lg border p-4 space-y-2"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text2)]">{col.label}</span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    color: col.color,
                    background: `color-mix(in srgb, ${col.color} 12%, transparent)`,
                  }}
                >
                  {col.badge}
                </span>
              </div>
              <pre className="text-[10px] font-mono text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                {col.lines.join('\n')}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* SSE vs WebSocket */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">SSE vs WebSocket vs Long Polling</h2>
        <div className="space-y-2">
          {[
            { label: 'Short Polling',  dir: 'Client → Server (repeated)', infra: 'Any HTTP server', sticky: 'No',  color: '#f87171', use: 'Prototypes only' },
            { label: 'Long Polling',   dir: 'Client → Server (hold)',     infra: 'Any HTTP server', sticky: 'No',  color: '#fbbf24', use: 'Low-frequency updates' },
            { label: 'SSE',            dir: 'Server → Client only',       infra: 'HTTP/2 native',   sticky: 'No',  color: COLOR,       use: 'Live feeds, dashboards' },
            { label: 'WebSocket',      dir: 'Full-duplex (both sides)',   infra: 'Needs pub/sub LB', sticky: 'Yes', color: 'var(--c-api)', use: 'Chat, collab, gaming' },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-4 items-center gap-3 rounded-lg border px-4 py-3 text-[11px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
              <span className="font-semibold font-mono" style={{ color: row.color }}>{row.label}</span>
              <span className="text-[var(--text2)]">{row.dir}</span>
              <span className="text-[var(--muted)]">{row.infra}</span>
              <span className="text-[var(--text2)]">{row.use}</span>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-3 px-4 text-[9px] font-mono text-[var(--muted)] uppercase tracking-wider pt-0.5">
            <span>Protocol</span><span>Direction</span><span>Infrastructure</span><span>Best for</span>
          </div>
        </div>
      </div>

      <Callout type="info" title="Server-Sent Events (SSE) frame format:">
        SSE sends plain text over HTTP: <code className="font-mono text-[10px]">data: {'{"event":"msg","text":"hi"}'}\n\n</code>{' '}
        Double newline terminates each event. The browser's EventSource API handles reconnection automatically. Works with HTTP/2 multiplexing — no sticky sessions needed.
      </Callout>

      {/* Big Tech blog links */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech builds real-time</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          Engineering posts from the teams who run WebSockets at millions-of-users scale.
        </p>
        <div className="space-y-3">
          {BLOG_LINKS.map((link) => (
            <a
              key={link.company}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border p-4 transition-all block group"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--line)',
                textDecoration: 'none',
              }}
            >
              {/* Logo */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: link.color }}
              >
                {link.logo}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p
                    className="text-[12px] font-semibold leading-snug group-hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    {link.title}
                  </p>
                  {/* External link icon */}
                  <svg
                    width="12" height="12"
                    viewBox="0 0 12 12" fill="none"
                    className="flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-80 transition-opacity"
                  >
                    <path d="M3.5 1H11M11 1V8.5M11 1L1 11" stroke="var(--text2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed mb-2">
                  {link.description}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{
                      color: link.color,
                      background: `color-mix(in srgb, ${link.color} 12%, transparent)`,
                    }}
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

      <Callout type="warn" title="Production gotcha — sticky sessions:">
        Every blog above solves the same problem: WebSockets are stateful, but servers must be
        stateless to scale horizontally. The answer is always a pub/sub broker (Redis Pub/Sub,
        Kafka, or a managed service like Ably/Pusher) that decouples message routing from
        connection holding. The WS server holds connections; the broker routes messages.
      </Callout>
    </div>
  );
}
