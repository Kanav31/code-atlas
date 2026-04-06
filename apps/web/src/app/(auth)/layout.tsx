export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--c-api)] flex items-center justify-center">
              <span className="text-[var(--bg)] font-bold text-sm font-heading">CA</span>
            </div>
            <span className="text-xl font-bold font-heading text-[var(--text)] tracking-tight">
              Code <span className="text-[var(--c-api)]">Atlas</span>
            </span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
