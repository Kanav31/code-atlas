'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (!token) {
      toast({ variant: 'destructive', title: 'Invalid reset link' });
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      toast({ title: 'Password reset successfully', description: 'You can now log in.' });
      router.push('/login');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'The link may be expired.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-[var(--text)] tracking-tight">
          Set new password
        </h1>
        <p className="text-sm text-[var(--text2)] mt-1">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
