'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QAItem {
  q: string;
  a: string;
}

interface InterviewQAProps {
  items: QAItem[];
  accentColor?: string;
}

export function InterviewQA({ items, accentColor = 'var(--c-api)' }: InterviewQAProps) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--line)] bg-[var(--bg2)] overflow-hidden"
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3 hover:bg-[var(--bg3)] transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-[var(--text)] flex gap-3 items-start">
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0"
                style={{
                  color: accentColor,
                  backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                }}
              >
                Q{i + 1}
              </span>
              {item.q}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-[var(--muted)] flex-shrink-0 transition-transform duration-200',
                open === i && 'rotate-180',
              )}
            />
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-0">
              <div
                className="h-px w-full mb-3"
                style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)` }}
              />
              <p className="text-sm text-[var(--text2)] leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
