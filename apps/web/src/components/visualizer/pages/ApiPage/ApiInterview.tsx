import { InterviewQA } from '@/components/visualizer/shared/InterviewQA';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

const CONCEPTUAL = [
  {
    q: 'What is the main performance advantage of gRPC over REST?',
    a: 'gRPC uses Protocol Buffers (binary serialization ~6× smaller than JSON) over HTTP/2 (multiplexed, persistent connections). This means less serialization overhead, less bandwidth, and no connection setup per request. Typical latency improvement is 5–10× for small payloads in microservice networks.',
  },
  {
    q: 'What is head-of-line blocking and how does HTTP/2 solve it?',
    a: 'In HTTP/1.1, a slow response blocks all subsequent requests on that connection — each TCP connection handles one request at a time. HTTP/2 assigns each request a stream ID and interleaves frames from multiple streams on the same connection. A slow stream (e.g., a large image) does not block faster ones (e.g., API calls). This is head-of-line blocking elimination at the HTTP layer.',
  },
  {
    q: "Why can't browsers call gRPC services directly?",
    a: "Browsers don't expose low-level HTTP/2 framing APIs needed for gRPC. The Fetch API abstracts stream handling and adds its own framing. Solutions: use gRPC-Web (a browser-compatible subset with a thin proxy layer), or an envoy/nginx gateway that translates HTTP/1.1 REST calls to gRPC on the backend.",
  },
  {
    q: 'What is a .proto file and what does it generate?',
    a: 'A .proto file defines message schemas and service RPCs using Protocol Buffer IDL. The protoc compiler generates client stubs and server interfaces in the target language (Go, Python, Java, TypeScript, etc.). This gives you type-safe, auto-serializing code. Changing a field type in .proto immediately breaks the build across all consuming services — enforcing contract stability.',
  },
  {
    q: 'What is idempotency and why does it matter in REST?',
    a: "An idempotent operation produces the same result no matter how many times it's called. GET, PUT, and DELETE are idempotent; POST is not. This matters for retries — if a network request fails, you can safely retry idempotent methods. It's also why PATCH (partial update) is not always idempotent — it depends on the operation.",
  },
  {
    q: 'How does HTTP/2 multiplexing improve performance?',
    a: 'HTTP/1.1 allows only one in-flight request per TCP connection. HTTP/2 streams multiple requests simultaneously over a single connection using integer stream IDs. A slow response no longer blocks faster ones, and TCP + TLS handshake happens once for the lifetime of the connection — not per request.',
  },
];

const SCENARIO = [
  {
    q: "You're building an internal service at Netflix with 700 microservices. Which protocol? Why?",
    a: 'gRPC. Reasons: (1) Strict .proto contracts prevent interface drift between teams — a breaking change fails the build immediately. (2) Protobuf binary is 6× smaller than JSON, critical at 1B+ internal calls/day. (3) HTTP/2 multiplexing avoids per-request TCP overhead. (4) Code-gen stubs mean no manual serialization boilerplate. Netflix uses this exact pattern: REST for public APIs, gRPC internally.',
  },
  {
    q: "You're designing the Uber driver location system. 500K active rides, each needs location updates every 1s. REST or gRPC?",
    a: "gRPC server-streaming. REST polling at 1s intervals = 500K × 60 = 30M req/min — each paying TCP handshake overhead. gRPC opens 1 persistent stream per ride; the server pushes location frames continuously. Result: 500K open HTTP/2 streams vs 30M polling requests per minute. Less bandwidth, near-zero per-update latency, and no thundering herd from synchronized polling.",
  },
  {
    q: 'A startup asks: "We want a public API for third-party developers and a fast internal API for our own 10 microservices." How do you design this?',
    a: 'Two layers: (1) Public API: REST/JSON behind a gateway (e.g., Kong or AWS API Gateway). Third-party devs can use curl, Postman, any language. Document with OpenAPI/Swagger. (2) Internal APIs: gRPC with .proto contracts. Services communicate in binary, no repeated handshakes, strict schema enforcement. The gateway can optionally translate public REST calls into internal gRPC calls (transcoding). This is the Google/Netflix/Uber standard pattern.',
  },
  {
    q: 'A legacy REST service is causing 800ms P99 latency between two internal microservices at 2,000 req/s. What would you investigate?',
    a: "First check: (1) Is HTTP/1.1 creating a new TCP connection per request? At 2K req/s that's 6K handshake packets/s. Enable keep-alive if not. (2) Is JSON payload large? Measure payload size — if >10KB, protobuf migration could help. (3) Is the bottleneck serialization or network? Profile both. (4) If both are issues, migrate to gRPC: eliminates per-request TCP setup and reduces payload 6×. Uber reduced P99 latency by ~35% this way.",
  },
];

const TRADEOFF = [
  {
    q: 'When would you choose REST over gRPC?',
    a: 'REST is better for: (1) Public APIs consumed by third parties — no code-gen required, works with any HTTP client. (2) Browser clients without a proxy layer. (3) Simple CRUD services where strict contracts are overkill. (4) APIs that need to be human-readable and debuggable with curl/Postman. (5) Teams without protobuf toolchain experience or CI/CD integration for code-gen.',
  },
  {
    q: 'What are 3 real downsides of gRPC?',
    a: "(1) Toolchain complexity: .proto files require protoc and language plugins, plus CI/CD integration to regenerate stubs on schema changes. Debugging requires protobuf decoders — no plain curl. (2) Browser limitation: browsers can't make native gRPC calls; you need gRPC-Web + a proxy, adding infrastructure. (3) Schema coupling: the .proto contract must be versioned carefully. Removing a field breaks all clients immediately — requires field deprecation patterns and careful backward-compatibility management.",
  },
  {
    q: 'Describe the REST Richardson Maturity Model. What level do most production APIs reach?',
    a: 'Level 0: plain HTTP as a tunnel (SOAP-style, single endpoint). Level 1: resources (/users, /orders) — each entity has its own URL. Level 2: HTTP verbs (GET/POST/PUT/DELETE) with correct status codes (200/201/404/422). Level 3: HATEOAS — responses include hyperlinks to next available actions. Most production REST APIs target Level 2. Level 3 is rare in practice — it adds complexity without clear benefit for most API consumers.',
  },
  {
    q: 'How would you add gRPC to an existing REST codebase incrementally?',
    a: "Strangler fig pattern: (1) Keep existing REST endpoints unchanged — don't break existing clients. (2) Add a gRPC server alongside the REST server in the same process (different port). (3) Migrate internal service-to-service calls to gRPC first — no user impact. (4) For new endpoints, expose both REST (for external) and gRPC (for internal). (5) Use a transcoding layer (e.g., grpc-gateway in Go, or envoy) to auto-generate REST endpoints from .proto definitions, eliminating duplication.",
  },
];

export function ApiInterview() {
  return (
    <div className="px-8 py-6 content-zone space-y-8">
      <BeginnerWarning prerequisites={['HTTP request/response cycle', 'TCP connection', 'JSON serialization']} />
      {/* Conceptual */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Conceptual questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Core mechanics — expect these in any systems design screen.
          </p>
        </div>
        <InterviewQA items={CONCEPTUAL} accentColor="var(--c-api)" />
      </div>

      {/* Scenario */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Scenario questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Real-world design decisions at scale — common in senior / staff interviews.
          </p>
        </div>
        <InterviewQA items={SCENARIO} accentColor="var(--c-api)" />
      </div>

      {/* Trade-off */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Trade-off questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Interviewers test whether you know the downsides, not just the upsides.
          </p>
        </div>
        <InterviewQA items={TRADEOFF} accentColor="var(--c-api)" />
      </div>
    </div>
  );
}
