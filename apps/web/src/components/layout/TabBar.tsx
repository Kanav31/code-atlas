'use client';

import { cn } from '@/lib/utils';

const TABS = [
  { id: 'understand', label: 'Understand It' },
  { id: 'play', label: 'Play With It' },
  { id: 'deepdive', label: 'Deep Dive' },
  { id: 'interview', label: 'Interview Prep' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  accentColor: string;
}

export function TabBar({ active, onChange, accentColor }: TabBarProps) {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--bg1)]">
      <div className="content-zone px-8 flex gap-0">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text2)] border-transparent',
            )}
            style={isActive ? { borderColor: accentColor, color: 'var(--text)' } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
      </div>
    </div>
  );
}
