'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useToast } from '@/hooks/use-toast';

type Step = 'form' | 'email-sent';

const PASSWORD_REGEX = /^(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export default function SignupForm() {
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [step, setStep] = useState<Step>('form');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Must be at least 8 characters and include a number or symbol.',
      });
      return;
    }
    setLoading(true);
    try {
      await api.register({ name, email, password, subscribeNewsletter: newsletter });
      setStep('email-sent');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.resendVerification();
      toast({ title: 'Verification email resent', description: 'Check your inbox.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not resend. Please try again.' });
    } finally {
      setResending(false);
    }
  }

  if (step === 'email-sent') {
    return (
      <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8 text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--c-api) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--c-api) 25%, transparent)' }}>
            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="7" width="26" height="18" rx="3" stroke="var(--c-api)" strokeWidth="1.8" />
              <path d="M3 11l13 9 13-9" stroke="var(--c-api)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="24" cy="8" r="4" fill="var(--c-api)" />
              <path d="M22.5 8l1 1 2-2" stroke="var(--bg)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-heading text-[var(--text)] tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm text-[var(--text2)] leading-relaxed">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-[var(--text)] bg-[var(--bg3)] px-3 py-1.5 rounded-lg inline-block font-mono">
            {email}
          </p>
          <p className="text-xs text-[var(--muted)] pt-1">
            Click the link to verify your account. You&apos;ll be signed in automatically.
          </p>
        </div>

        <div className="w-full h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--c-api)] animate-pulse" style={{ width: '100%', opacity: 0.6 }} />
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[var(--muted)]">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-[var(--c-api)] hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending…' : 'resend the email'}
            </button>
            .
          </p>
          <p className="text-xs text-[var(--muted)]">
            Already verified?{' '}
            <Link href="/login" className="text-[var(--c-api)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[var(--text)] tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Start learning systems engineering interactively
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Alex Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 chars + 1 number or symbol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              id="newsletter"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="sr-only"
            />
            <div
              aria-hidden="true"
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                newsletter
                  ? 'bg-[var(--c-api)] border-[var(--c-api)]'
                  : 'border-[var(--line2)] bg-[var(--bg2)]'
              }`}
            >
              {newsletter && (
                <svg className="w-2.5 h-2.5 text-[var(--bg)]" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-[var(--text2)] leading-relaxed">
            Notify me about new features and modules via email
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-[var(--text2)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--c-api)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
