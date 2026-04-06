import { Suspense } from 'react';
import VerifiedContent from './VerifiedContent';

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-[var(--c-api)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifiedContent />
    </Suspense>
  );
}
