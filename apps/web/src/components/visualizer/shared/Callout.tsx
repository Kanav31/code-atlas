import { cn } from '@/lib/utils';
import { AlertTriangle, Lightbulb, Flame, Info } from 'lucide-react';

type CalloutType = 'warn' | 'tip' | 'fire' | 'info';

const CALLOUT_STYLES: Record<CalloutType, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  warn:  { bg: 'bg-amber-500/8',  border: 'border-amber-500/25',  icon: AlertTriangle, iconColor: '#f59e0b' },
  tip:   { bg: 'bg-emerald-500/8', border: 'border-emerald-500/25', icon: Lightbulb,    iconColor: '#34d399' },
  fire:  { bg: 'bg-red-500/8',    border: 'border-red-500/25',    icon: Flame,         iconColor: '#f87171' },
  info:  { bg: 'bg-blue-500/8',   border: 'border-blue-500/25',   icon: Info,          iconColor: '#60a5fa' },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const { bg, border, icon: Icon, iconColor } = CALLOUT_STYLES[type];
  return (
    <div className={cn('rounded-lg border px-4 py-3.5 flex gap-3', bg, border)}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
      <div className="text-sm text-[var(--text2)] leading-relaxed">
        {title && <span className="font-semibold text-[var(--text)]">{title} </span>}
        {children}
      </div>
    </div>
  );
}
