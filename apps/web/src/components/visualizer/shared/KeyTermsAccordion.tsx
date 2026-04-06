'use client';

import { useState } from 'react';

interface Concept {
  term: string;
  plain: string;
  analogy: string;
}

interface KeyTermsAccordionProps {
  concepts: Concept[];
  accentColor: string;
}

export function KeyTermsAccordion({ concepts, accentColor }: KeyTermsAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `color-mix(in srgb, ${accentColor} 20%, var(--line))`,
        background: `color-mix(in srgb, ${accentColor} 3%, var(--bg1))`,
      }}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg2)]"
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border"
            style={{
              color: accentColor,
              borderColor: `color-mix(in srgb, ${accentColor} 35%, transparent)`,
              background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
            }}
          >
            Key terms
          </span>
          <span className="text-[10px] font-mono text-[var(--muted)]">
            {concepts.length} concepts · click to {open ? 'hide' : 'review'}
          </span>
        </div>
        <span
          className="text-[10px] font-mono transition-transform"
          style={{
            color: accentColor,
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {/* Concept list */}
      {open && (
        <div
          className="border-t px-4 pb-4 pt-3 space-y-2.5"
          style={{ borderColor: `color-mix(in srgb, ${accentColor} 15%, var(--line))` }}
        >
          {concepts.map((c, i) => (
            <div
              key={c.term}
              className="flex gap-3 rounded-lg border px-3 py-2.5"
              style={{ background: 'var(--bg2)', borderColor: 'var(--line)' }}
            >
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
      )}
    </div>
  );
}
