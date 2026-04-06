interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  accentColor: string;
}

export function PageHeader({ eyebrow, title, description, accentColor }: PageHeaderProps) {
  return (
    <div className="border-b border-[var(--line)]">
      <div className="content-zone px-8 pt-8 pb-6">
        <p
          className="text-xs font-semibold font-mono uppercase tracking-widest mb-2"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </p>
        <h1
          className="text-[2.4rem] font-extrabold font-heading tracking-tight text-[var(--text)] leading-tight"
        >
          {title}
        </h1>
        <p className="mt-2 text-[var(--text2)] text-sm max-w-2xl leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
