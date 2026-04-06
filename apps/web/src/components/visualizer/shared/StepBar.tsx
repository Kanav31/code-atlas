'use client';

interface StepBarProps {
  total: number;
  current: number;
  label?: string;
  score?: string;
  accentColor?: string;
}

export function StepBar({ total, current, label, score, accentColor = 'var(--c-api)' }: StepBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--line)] bg-[var(--bg1)] flex-shrink-0">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: i <= current ? accentColor : 'var(--dim)',
              opacity: i <= current ? 1 : 0.3,
              transition: 'all 0.3s',
              boxShadow:
                i === current
                  ? `0 0 0 3px color-mix(in srgb, ${accentColor} 30%, transparent)`
                  : undefined,
            }}
          />
        ))}
      </div>
      {label && (
        <span className="ml-1 flex-1 text-[10px] font-mono text-[var(--muted)] truncate">{label}</span>
      )}
      {score && (
        <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: accentColor }}>
          {score}
        </span>
      )}
    </div>
  );
}
