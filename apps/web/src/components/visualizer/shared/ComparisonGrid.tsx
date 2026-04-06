import React from 'react';
import { cn } from '@/lib/utils';

interface ComparisonItem {
  title: string;
  items: React.ReactNode[];
  accent?: string;
  badge?: { label: string; color?: string };
}

interface ComparisonGridProps {
  columns: ComparisonItem[];
}

export function ComparisonGrid({ columns }: ComparisonGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      {columns.map((col, i) => (
        <div
          key={i}
          className="rounded-lg bg-[var(--bg2)] border border-[var(--line)] p-4"
          style={col.accent ? { borderTopColor: col.accent, borderTopWidth: 2 } : undefined}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--text)]">{col.title}</h4>
            {col.badge && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{
                  color: col.badge.color ?? col.accent ?? 'var(--muted)',
                  borderColor: col.badge.color ?? col.accent ?? 'var(--line2)',
                  backgroundColor: `color-mix(in srgb, ${col.badge.color ?? col.accent ?? '#888'} 10%, transparent)`,
                }}
              >
                {col.badge.label}
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {col.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: col.accent ?? 'var(--muted)' }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
