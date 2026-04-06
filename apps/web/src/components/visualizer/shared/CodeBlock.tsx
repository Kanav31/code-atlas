interface Line {
  type: 'kw' | 'str' | 'cm' | 'fn' | 'num' | 'key' | 'plain';
  text: string;
}

// Simple inline syntax highlighted code block
// For full syntax highlighting, integrate Shiki or Prism
interface CodeBlockProps {
  title?: string;
  language?: string;
  lines: (string | Line[])[];
}

export function CodeBlock({ title, language = 'typescript', lines }: CodeBlockProps) {
  return (
    <div className="rounded-lg bg-[var(--bg1)] border border-[var(--line)] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--bg2)]">
          <span className="text-xs font-mono font-medium text-[var(--text2)]">{title}</span>
          <span className="text-[10px] font-mono text-[var(--muted)] uppercase">{language}</span>
        </div>
      )}
      <pre className="px-4 py-4 overflow-x-auto text-xs font-mono leading-relaxed text-[var(--text2)]">
        {lines.map((line, i) => (
          <div key={i}>
            {typeof line === 'string' ? (
              line
            ) : (
              line.map((segment, j) => (
                <span key={j} className={`syntax-${segment.type}`}>
                  {segment.text}
                </span>
              ))
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}
