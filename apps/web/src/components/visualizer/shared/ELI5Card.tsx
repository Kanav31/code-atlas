import { cn } from '@/lib/utils';

interface ELI5CardProps {
  children: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export function ELI5Card({ children, accentColor = 'var(--c-api)', className }: ELI5CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-[var(--bg2)] border border-[var(--line)] pl-4 pr-5 py-4 relative overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: accentColor }}
      />
      <div className="text-sm text-[var(--text2)] leading-relaxed">{children}</div>
    </div>
  );
}
