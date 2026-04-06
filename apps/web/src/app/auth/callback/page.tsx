import { Suspense } from 'react';
import AuthCallbackHandler from './AuthCallbackHandler';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--c-api)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--text2)]">Signing you in…</p>
        </div>
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  );
}
