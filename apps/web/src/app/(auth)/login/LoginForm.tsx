'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useToast } from '@/hooks/use-toast';

function LoginFormInner() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, next);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Invalid credentials.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[var(--text)] tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Sign in to your Code Atlas account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-[var(--c-api)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-[var(--text2)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[var(--c-api)] hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8 h-96 animate-pulse" />}>
      <LoginFormInner />
    </Suspense>
  );
}
