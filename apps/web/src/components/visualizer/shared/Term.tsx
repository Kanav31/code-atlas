'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { GLOSSARY } from '@/lib/glossary';

interface TermProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export function Term({ term, children, className }: TermProps) {
  const entry = GLOSSARY[term];

  // If term not in glossary, render as plain text — never crash
  if (!entry) return <span className={className}>{children}</span>;

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span
            tabIndex={0}
            className={className}
            style={{
              borderBottom: '1px dashed var(--muted)',
              cursor: 'help',
              display: 'inline',
            }}
            aria-label={`${String(children)} — ${entry.short}`}
          >
            {children}
          </span>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="center"
            sideOffset={6}
            style={{
              maxWidth: 260,
              background: 'var(--bg3)',
              border: '1px solid var(--line2)',
              borderRadius: 8,
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: 'var(--text)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {entry.short}
            </p>
            {entry.analogy && (
              <>
                <div
                  style={{
                    margin: '6px 0 4px',
                    borderTop: '1px solid var(--line)',
                  }}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    lineHeight: 1.5,
                    margin: 0,
                    fontStyle: 'normal',
                  }}
                >
                  {entry.analogy}
                </p>
              </>
            )}
            <TooltipPrimitive.Arrow
              style={{ fill: 'var(--line2)' }}
              width={10}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
