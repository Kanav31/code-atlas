import { cn } from '@/lib/utils';

type TagVariant = 'good' | 'bad' | 'neutral';

const VARIANT_STYLES: Record<TagVariant, string> = {
  good:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  bad:     'bg-red-500/10 text-red-400 border-red-500/25',
  neutral: 'bg-[var(--bg3)] text-[var(--muted)] border-[var(--line2)]',
};

interface TagProps {
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
}

export function Tag({ variant = 'neutral', children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
