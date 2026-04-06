import { CodeBlock } from '@/components/visualizer/shared/CodeBlock';
import { Callout } from '@/components/visualizer/shared/Callout';
import { Tag } from '@/components/visualizer/shared/Tag';
import { BeginnerWarning } from '@/components/visualizer/shared/BeginnerWarning';

export function ApiDeepDive() {
  return (
    <div className="px-8 py-6 space-y-6 content-zone">
      <BeginnerWarning prerequisites={['HTTP request/response cycle', 'TCP connection', 'JSON serialization']} />
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Protobuf vs JSON size</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--bg2)] border border-[var(--line)] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text2)]">JSON payload</span>
              <Tag variant="bad">~240 B</Tag>
            </div>
            <div className="font-mono text-xs text-[var(--muted)] whitespace-pre">{`{
  "id": 42,
  "name": "Alice Chen",
  "role": "engineer"
}`}</div>
          </div>
          <div className="bg-[var(--bg2)] border border-[var(--line)] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text2)]">Protobuf payload</span>
              <Tag variant="good">~38 B</Tag>
            </div>
            <div className="font-mono text-xs text-[var(--muted)] whitespace-pre">{`// Binary encoding
0a 02 2a 00
12 0a 41 6c
...  (38 bytes)`}</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">Proto definition</h2>
        <CodeBlock
          title="user.proto"
          language="protobuf"
          lines={[
            'syntax = "proto3";',
            '',
            'service UserService {',
            '  rpc GetUser(GetUserRequest) returns (User);',
            '  rpc StreamUsers(Empty) returns (stream User);',
            '}',
            '',
            'message GetUserRequest {',
            '  int32 id = 1;',
            '}',
            '',
            'message User {',
            '  int32  id   = 1;',
            '  string name = 2;',
            '  string role = 3;',
            '}',
          ]}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">gRPC streaming modes</h2>
        <div className="space-y-2">
          {[
            { mode: 'Unary', desc: 'One request → One response. Like REST. Default mode.', tag: 'client→server→client' },
            { mode: 'Server streaming', desc: 'One request → Stream of responses. Good for real-time feeds.', tag: 'client→server→…→client' },
            { mode: 'Client streaming', desc: 'Stream of requests → One response. Good for file uploads.', tag: 'client→…→server→client' },
            { mode: 'Bidirectional', desc: 'Both sides stream simultaneously. Perfect for chat or gaming.', tag: 'client⇄server' },
          ].map((item) => (
            <div key={item.mode} className="flex items-start gap-3 bg-[var(--bg2)] border border-[var(--line)] rounded-lg px-4 py-3">
              <span className="text-xs font-semibold text-[var(--c-api)] font-mono w-28 flex-shrink-0 mt-0.5">{item.mode}</span>
              <span className="text-xs text-[var(--text2)] flex-1 leading-relaxed">{item.desc}</span>
              <code className="text-[10px] font-mono text-[var(--muted)] flex-shrink-0">{item.tag}</code>
            </div>
          ))}
        </div>
      </div>

      <Callout type="warn" title="gRPC gotcha:">
        Browsers cannot call gRPC services directly (they can't control HTTP/2 framing). You need
        gRPC-Web or a gateway that translates REST to gRPC internally.
      </Callout>

      {/* Big Tech section */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text)] mb-1">How Big Tech uses this</h2>
        <p className="text-xs text-[var(--muted)] mb-3">Real production decisions — not toy examples.</p>
        <div className="space-y-3">
          {[
            {
              company: 'Google',
              logo: 'G',
              color: '#4285F4',
              title: 'Invented gRPC — 10B+ RPCs/second in production',
              points: [
                'Built Protobuf in 2001 to replace hand-written XML parsing between internal services.',
                'Open-sourced gRPC in 2015. All Google services (Search, Maps, YouTube) communicate internally over gRPC.',
                'HTTP/2 multiplexing lets a single backend connection handle hundreds of concurrent user queries simultaneously.',
              ],
            },
            {
              company: 'Netflix',
              logo: 'N',
              color: '#E50914',
              title: 'REST for public APIs · gRPC for internal microservices',
              points: [
                'Public API (what the Netflix app calls): REST/JSON — easy to debug, no client code-gen required.',
                'Internal microservices (700+ services): gRPC — strict contracts via .proto prevent interface drift between teams.',
                'Lesson: use the right tool per boundary. Public = REST. Internal = gRPC.',
              ],
            },
            {
              company: 'Uber',
              logo: 'U',
              color: '#000000',
              title: 'gRPC for sub-100ms rider/driver location updates',
              points: [
                'Driver location must reach rider in <100ms for a good UX. REST polling at that cadence = 36K req/min per ride.',
                'gRPC server-streaming: driver app streams location frames; rider app receives them over a persistent HTTP/2 connection.',
                'Result: 1 open stream per ride vs 36K polling requests. 3× less bandwidth, near-zero connection overhead.',
              ],
            },
            {
              company: 'Meta',
              logo: 'M',
              color: '#0866FF',
              title: 'Thrift (Meta\'s precursor to Protobuf) at planetary scale',
              points: [
                'Meta built Apache Thrift before Protobuf existed — same idea: binary IDL, code-gen stubs, integer field IDs.',
                'Serves billions of users with internal RPC on Thrift/HTTP/2 stacks. Key insight: field names on the wire are wasteful.',
                'Modern Meta services migrating to gRPC + Protobuf for cross-language consistency (PHP, C++, Python, Java).',
              ],
            },
          ].map((item) => (
            <div
              key={item.company}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg2)] p-4 space-y-2.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: item.color }}
                >
                  {item.logo}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: item.color }}>
                    {item.company}
                  </span>
                  <p className="text-[11px] font-semibold text-[var(--text)] leading-snug">{item.title}</p>
                </div>
              </div>
              <ul className="space-y-1.5 pl-1">
                {item.points.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-[var(--text2)] leading-snug">
                    <span className="text-[var(--c-api)] flex-shrink-0 mt-px">›</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Callout type="tip" title="The pattern:">
        Every company above uses REST at the public boundary (browsers, third-party devs) and gRPC
        internally (service-to-service). The reason is always the same — REST is debuggable and
        universally understood; gRPC is fast and contract-safe.
      </Callout>
    </div>
  );
}
