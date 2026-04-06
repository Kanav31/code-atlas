import { ELI5Card } from '@/components/visualizer/shared/ELI5Card';
import { type LogLine } from '@/components/visualizer/shared/Terminal';

interface WhatHappenedPanelProps {
  lines: LogLine[];
  accentColor: string;
  visible: boolean;
}

const EXPLANATION_TAGS = new Set(['WHY', 'IMP', 'INS', 'SUM']);

// Strip leading arrow/label prefixes from terminal log messages
function cleanMessage(msg: string): string {
  return msg
    .replace(/^↳\s*(WHY|IMPACT|IMP|INS|SUM|CMP):\s*/i, '')
    .replace(/^(WHY|IMPACT|IMP|INS|SUM|CMP):\s*/i, '')
    .trim();
}

export function WhatHappenedPanel({ lines, accentColor, visible }: WhatHappenedPanelProps) {
  if (!visible) return null;

  const summaryLines = lines.filter((l) => l.tag === 'SUM');
  const explanationLines = lines.filter((l) => EXPLANATION_TAGS.has(l.tag) && l.tag !== 'SUM');

  if (summaryLines.length === 0 && explanationLines.length === 0) return null;

  return (
    <div className="mx-4 mt-2 mb-1">
      <ELI5Card accentColor={accentColor}>
        <p className="font-semibold text-[var(--text)] text-xs mb-2">What just happened?</p>

        {summaryLines.length > 0 && (
          <div className="mb-2 space-y-1">
            {summaryLines.map((line) => (
              <p
                key={line.id}
                className="text-[11px] font-mono"
                style={{ color: line.tagColor }}
              >
                {cleanMessage(line.message)}
              </p>
            ))}
          </div>
        )}

        {explanationLines.length > 0 && (
          <ul className="space-y-1.5">
            {explanationLines.map((line) => (
              <li key={line.id} className="flex items-start gap-2 text-[11px]">
                <span
                  className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: line.tagColor }}
                />
                <span className="text-[var(--text2)] leading-snug">{cleanMessage(line.message)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Turn off Beginner Mode in the sidebar to read the full simulation log.
        </p>
      </ELI5Card>
    </div>
  );
}
