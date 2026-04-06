import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const COLOR = 'var(--c-rt)';

const CONCEPTUAL = [
  {
    q: 'What is the difference between short polling and long polling?',
    a: 'Short polling sends repeated HTTP requests at a fixed interval (e.g., every 1s), most returning empty 204 responses — pure overhead. Long polling sends a request and the server holds it open until data is available, then responds with data. The client immediately opens a new long-poll. This eliminates empty responses but still creates a new TCP connection after each response — not truly persistent.',
  },
  {
    q: 'Explain the WebSocket handshake step by step.',
    a: '(1) Client sends HTTP/1.1 GET with headers: Upgrade: websocket, Connection: Upgrade, Sec-WebSocket-Key (base64 nonce), Sec-WebSocket-Version: 13. (2) Server responds 101 Switching Protocols with Sec-WebSocket-Accept (SHA-1 of key + GUID, base64-encoded). (3) TCP connection is now repurposed — no more HTTP. Both sides use the WebSocket framing protocol: 2–10 byte frame header + payload. From here, either side can send at any time with near-zero overhead.',
  },
  {
    q: 'When should you use Server-Sent Events (SSE) instead of WebSockets?',
    a: "SSE is unidirectional (server → client only), uses plain HTTP, and auto-reconnects on disconnect. Choose SSE when: (1) Client only consumes data — live feeds, dashboards, notifications, activity streams. (2) You want to stay on HTTP/2 — SSE multiplexes naturally, WebSockets are a separate protocol. (3) Your infrastructure doesn't support sticky sessions — SSE works with normal HTTP load balancing. Avoid SSE when clients need to send messages too.",
  },
  {
    q: 'How do WebSockets work behind a load balancer? What problem arises?',
    a: "WebSockets are long-lived TCP connections to a specific server instance. Standard round-robin load balancing would route the client to a different backend on reconnect, losing the session. The fix: sticky sessions (session affinity) — the LB must route the same client to the same server. Second problem: if that server goes down, all its WebSocket clients disconnect simultaneously. Solution: decouple message routing from connection holding via a pub/sub broker (Redis Pub/Sub, Kafka) so any server instance can fan out messages.",
  },
  {
    q: 'What is backpressure and why does it matter in real-time streams?',
    a: "Backpressure occurs when a producer sends data faster than a consumer can process it. In WebSocket servers: if the server streams faster than the client reads, the client's receive buffer fills, the TCP window shrinks, and the server's send buffer eventually blocks. Solutions: (1) Rate limiting — server checks client acknowledgments before sending more. (2) Flow control — explicit 'ready for more' signals from client. (3) Drop / downsample — for live video or data, skip frames if the client is behind rather than queuing unboundedly.",
  },
  {
    q: 'What is the per-message overhead of WebSocket vs HTTP?',
    a: 'WebSocket frame overhead: 2 bytes (for payload ≤125 bytes) to 10 bytes maximum. For a 50-byte chat message: 2 bytes framing = ~4% overhead. HTTP/1.1 equivalent: 200–800 bytes of headers (method, host, cookies, content-type, auth) = 400–1600% overhead. WebSocket saves ~98% of per-message overhead once the connection is established — which is why it matters enormously at millions of messages per day.',
  },
];

const SCENARIO = [
  {
    q: "You're building Slack — 10M concurrent users, messages must arrive in <100ms. How do you architect the real-time layer?",
    a: '(1) Each client opens a WebSocket to an edge gateway server. (2) Edge servers are stateless — they hold WS connections but route via a pub/sub layer. (3) When user A sends a message: API server processes it → publishes to a Redis channel for that Slack channel. (4) All edge servers subscribed to that Redis channel receive the event and push to their connected clients. (5) Sticky sessions at the LB keep each client on the same edge server. (6) For scale: partition edge servers by region, use consistent hashing for channel → edge server mapping. This is roughly how Slack, Discord, and Pusher work.',
  },
  {
    q: "You're building Figma's multiplayer editor — two users editing the same document simultaneously. How do you sync state?",
    a: '(1) WebSocket for transport — bidirectional, low latency. (2) Operational Transformation (OT) or CRDTs for conflict resolution — if User A and User B both move an element simultaneously, the algorithm merges the operations without data loss. (3) Each operation is timestamped and user-attributed. (4) Server is the source of truth — applies OT and rebroadcasts the resolved operation to all clients. (5) Optimistic local updates — your edit shows instantly, server confirms or adjusts. Figma uses a custom OT implementation over WebSockets; Google Docs uses OT too.',
  },
  {
    q: '100K mobile users are polling every 2 seconds for notifications. The system is falling over. What do you do?',
    a: '(1) Calculate the load: 100K × 0.5 req/s = 50,000 req/s just for polling. If notification rate is once/minute per user, 99.97% return empty. (2) Immediate fix: switch to long polling — reduces requests from 50K/s to ~notification frequency. (3) Better fix: WebSockets or mobile push (APNs/FCM) — server pushes only when there is something to say. (4) Mobile consideration: WebSockets drain battery when the app is backgrounded — use FCM/APNs for background delivery, WebSocket only when the app is active.',
  },
  {
    q: "A client's WebSocket connection drops. How do you handle reconnection in production?",
    a: "(1) Client detects disconnect via onclose/onerror events. (2) Implement exponential backoff with jitter — retry after 1s, then 2s, 4s, 8s... up to 30s max. Jitter prevents thundering herd (all clients reconnecting simultaneously after a server restart). (3) On reconnect, client sends 'resume from sequence #N' so the server can replay missed events. (4) Server-side: buffer the last N events per channel for a short window (30s) to support replay. (5) WebSocket ping-pong frames (built into the spec) detect zombie connections before the client notices.",
  },
];

const TRADEOFFS = [
  {
    q: 'What are 3 real downsides of WebSockets?',
    a: "(1) Infrastructure complexity: Requires sticky sessions at the load balancer, a pub/sub broker for multi-server fan-out, and stateful server management — none of which you need with REST. (2) Proxy/firewall unfriendly: Some corporate proxies and older firewalls don't support WebSocket upgrades. Fallback: use wss:// (TLS) which most proxies pass through, or fall back to long polling. (3) Hard to scale horizontally: A WebSocket to server A can't be handled by server B. If server A dies, all its connections drop simultaneously — 'thundering reconnect' from thousands of clients requires careful capacity planning and graceful draining.",
  },
  {
    q: 'WebSocket vs gRPC bidirectional streaming — when would you choose each?',
    a: 'gRPC bidirectional streaming: both sides send typed, schema-validated protobuf messages over HTTP/2. Best for: internal service-to-service real-time (driver location server → dispatch server), when you need strict typing, or polyglot systems. WebSocket: raw frames, any format (JSON, binary, text). Best for: browser clients (gRPC cannot run natively in browsers), chat/collaboration tools, or when you control both sides and do not need code-gen overhead. In practice: gRPC streaming for backend-to-backend, WebSocket for browser-facing real-time.',
  },
  {
    q: 'When would you NOT use WebSockets?',
    a: '(1) One-directional server push only: Use SSE — simpler, HTTP/2-native, no sticky sessions needed. (2) Infrequent updates (once per minute or less): The overhead of keeping 100K persistent connections alive outweighs the benefit. Long polling or push notifications are simpler. (3) Serverless / stateless infrastructure: WebSockets require persistent server processes — incompatible with pure serverless (Lambda/Cloud Functions timeout after 15–29 minutes). Use Ably, Pusher, or managed WS services instead. (4) Simple request-response: Just use REST. WebSockets add complexity with zero benefit when you only need fetch-and-forget.',
  },
];

export function RtInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['HTTP request/response cycle', 'TCP connection', 'full-duplex communication']} />
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Conceptual questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Protocol mechanics — foundational for any systems design screen.
          </p>
        </div>
        <InterviewQA items={CONCEPTUAL} accentColor={COLOR} />
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Scenario questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Design at Slack/Figma/Discord scale — common in senior and staff interviews.
          </p>
        </div>
        <InterviewQA items={SCENARIO} accentColor={COLOR} />
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Trade-off questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Interviewers want to know if you understand the downsides too.
          </p>
        </div>
        <InterviewQA items={TRADEOFFS} accentColor={COLOR} />
      </div>
    </div>
  );
}
