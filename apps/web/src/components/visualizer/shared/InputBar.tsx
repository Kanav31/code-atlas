'use client';

import { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeChip {
  id: string;
  label: string;
}

interface InputBarProps {
  modes?: ModeChip[];
  activeMode?: string;
  onModeChange?: (mode: string) => void;
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  accentColor?: string;
}

export function InputBar({
  modes,
  activeMode,
  onModeChange,
  value,
  onChange,
  onSend,
  placeholder = 'Type a message…',
  disabled = false,
  accentColor = 'var(--c-api)',
}: InputBarProps) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) onSend();
  };

  return (
    <div className="border-t border-[var(--line)] bg-[var(--bg1)] px-4 py-3 flex flex-col gap-2">
      {modes && modes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {modes.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange?.(m.id)}
                className={cn(
                  'text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all',
                  isActive
                    ? 'font-semibold'
                    : 'border-[var(--line2)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text2)]',
                )}
                style={
                  isActive
                    ? {
                        color: accentColor,
                        borderColor: accentColor,
                        backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                      }
                    : undefined
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-[var(--bg2)] border border-[var(--line2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50"
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        />
        <button
          onClick={onSend}
          disabled={disabled}
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <Send className="w-4 h-4 text-[var(--bg)]" />
        </button>
      </div>
    </div>
  );
}
