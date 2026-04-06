import Link from 'next/link';

export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg2)] border border-[var(--line)] flex items-center justify-center mx-auto text-3xl">
          ✉️
        </div>
        <div>
          <h1 className="text-2xl font-extrabold font-heading tracking-tight text-[var(--text)]">
            You&apos;re unsubscribed
          </h1>
          <p className="text-sm text-[var(--text2)] mt-2 leading-relaxed">
            You won&apos;t receive any more feature announcement emails from Code Atlas.
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Changed your mind? Re-subscribe any time from your{' '}
          <Link href="/dashboard/profile" className="text-[var(--c-api)] hover:underline">
            profile settings
          </Link>
          .
        </p>
        <Link href="/dashboard">
          <span className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[var(--bg2)] border border-[var(--line2)] text-sm font-medium text-[var(--text)] hover:border-[var(--muted)] transition-colors">
            Back to Code Atlas
          </span>
        </Link>
      </div>
    </div>
  );
}
