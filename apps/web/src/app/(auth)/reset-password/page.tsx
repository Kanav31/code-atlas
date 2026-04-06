import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8 animate-pulse space-y-4">
        <div className="h-7 bg-[var(--bg3)] rounded w-48" />
        <div className="h-4 bg-[var(--bg3)] rounded w-64" />
        <div className="h-10 bg-[var(--bg3)] rounded" />
        <div className="h-10 bg-[var(--bg3)] rounded" />
        <div className="h-10 bg-[var(--bg3)] rounded" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
