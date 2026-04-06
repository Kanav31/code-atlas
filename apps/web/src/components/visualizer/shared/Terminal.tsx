'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface LogLine {
  id: string;
  tag: string;
  tagColor: string;
  message: string;
  timestamp: string;
}

interface TerminalProps {
  lines: LogLine[];
  className?: string;
}

export function Terminal({ lines, className }: TerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div
      className={cn(
        'bg-[var(--bg)] rounded-lg border border-[var(--line)] font-mono overflow-y-auto',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--line)] bg-[var(--bg1)]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-2 text-[10px] text-[var(--muted)]">console</span>
      </div>
      <div className="p-3 space-y-0.5 min-h-[160px]" aria-live="polite" aria-label="simulation output" role="log">
        {lines.length === 0 && (
          <p className="text-[11px] text-[var(--dim)]">Ready. Hit send to simulate.</p>
        )}
        {lines.map((line) => (
          <div key={line.id} className="terminal-line flex items-start gap-2">
            <span className="text-[10px] text-[var(--dim)] flex-shrink-0 mt-0.5">
              {line.timestamp}
            </span>
            <span
              className="text-[10px] px-1.5 py-0 rounded font-semibold flex-shrink-0"
              style={{
                color: line.tagColor,
                backgroundColor: `color-mix(in srgb, ${line.tagColor} 12%, transparent)`,
              }}
            >
              {line.tag}
            </span>
            <span className="text-[11px] text-[var(--text2)] break-words flex-1">{line.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
