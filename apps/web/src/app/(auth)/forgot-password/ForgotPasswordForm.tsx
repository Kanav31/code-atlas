'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

export default function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      toast({ variant: 'destructive', title: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8">
      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="w-12 h-12 text-[var(--c-api)]" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[var(--text)] tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm text-[var(--text2)]">
            If <span className="text-[var(--text)] font-medium">{email}</span> is registered,
            you&apos;ll receive a password reset link within a few minutes.
          </p>
          <p className="text-xs text-[var(--muted)]">
            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="w-full mt-2">Back to login</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-heading text-[var(--text)] tracking-tight">
              Reset your password
            </h1>
            <p className="text-sm text-[var(--text2)] mt-1">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text2)]">
            Remember it?{' '}
            <Link href="/login" className="text-[var(--c-api)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
