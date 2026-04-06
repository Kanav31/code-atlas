interface PlaygroundHintProps {
  action: string;
  expect: string;
  accentColor: string;
}

export function PlaygroundHint({ action, expect, accentColor }: PlaygroundHintProps) {
  return (
    <div
      className="rounded-xl border px-4 py-3.5 flex flex-col gap-1.5"
      style={{
        background: `color-mix(in srgb, ${accentColor} 5%, var(--bg))`,
        borderColor: `color-mix(in srgb, ${accentColor} 25%, var(--line))`,
      }}
    >
      <span
        className="text-[9px] font-mono font-semibold tracking-widest uppercase w-fit px-1.5 py-0.5 rounded"
        style={{
          background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
          color: accentColor,
        }}
      >
        Start here
      </span>
      <p className="text-[12px] font-medium text-[var(--text)] leading-snug">{action}</p>
      <p className="text-[11px] leading-snug">
        <span className="text-[var(--muted)] text-[10px]">What to expect: </span>
        <span className="text-[var(--text2)]">{expect}</span>
      </p>
    </div>
  );
}
