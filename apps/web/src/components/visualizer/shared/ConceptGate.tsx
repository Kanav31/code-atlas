'use client';

interface Concept {
  term: string;
  plain: string;
  analogy: string;
}

interface ConceptGateProps {
  concepts: Concept[];
  accentColor: string;
  onReady: () => void;
}

export function ConceptGate({ concepts, accentColor, onReady }: ConceptGateProps) {
  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{
        background: `color-mix(in srgb, ${accentColor} 4%, var(--bg1))`,
        borderColor: `color-mix(in srgb, ${accentColor} 20%, var(--line))`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color: accentColor,
            borderColor: `color-mix(in srgb, ${accentColor} 35%, transparent)`,
            background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
          }}
        >
          Before we start
        </span>
        <span className="text-[10px] font-mono text-[var(--muted)]">
          3 terms you&apos;ll see — takes 30 seconds
        </span>
      </div>

      {/* Concept cards */}
      <div className="space-y-3">
        {concepts.map((c, i) => (
          <div
            key={c.term}
            className="flex gap-3 rounded-lg border px-3 py-2.5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
          >
            {/* Number */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
              style={{
                background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
                color: accentColor,
                border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
              }}
            >
              {i + 1}
            </div>

            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text)]">{c.term}</p>
              <p className="text-[11px] text-[var(--text2)] leading-snug">{c.plain}</p>
              <p className="text-[10px] text-[var(--muted)] leading-snug">
                <span style={{ color: accentColor }}>Like: </span>{c.analogy}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onReady}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
        style={{
          background: accentColor,
          color: '#080c10',
        }}
      >
        Got it — show me the simulation →
      </button>

      <p className="text-center text-[10px] text-[var(--muted)]">
        Turn off Beginner Mode in the sidebar to skip this next time
      </p>
    </div>
  );
}
