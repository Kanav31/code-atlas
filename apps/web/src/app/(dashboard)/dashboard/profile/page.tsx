'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Lock, Trash2, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [subscribed, setSubscribed] = useState(false);
  const [loadingNewsletter, setLoadingNewsletter] = useState(true);
  const [togglingNewsletter, setTogglingNewsletter] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatar) setAvatar(user.avatar ?? '');
  }, [user]);

  useEffect(() => {
    api.getNewsletterStatus()
      .then((s) => setSubscribed(s.subscribed))
      .catch(() => null)
      .finally(() => setLoadingNewsletter(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateMe({ name, ...(avatar ? { avatar } : {}) });
      toast({ title: 'Profile updated' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update failed', description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Password must be at least 8 characters' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast({ title: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to update password', description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleNewsletterToggle() {
    setTogglingNewsletter(true);
    try {
      if (subscribed) {
        await api.unsubscribeMe();
        setSubscribed(false);
        toast({ title: 'Unsubscribed', description: 'You will no longer receive updates.' });
      } else {
        await api.subscribeMe();
        setSubscribed(true);
        toast({ title: 'Subscribed', description: 'You will be notified of new features.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not update subscription' });
    } finally {
      setTogglingNewsletter(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'delete my account') return;
    setDeleting(true);
    try {
      await api.deleteAccount();
    } catch {
      toast({ variant: 'destructive', title: 'Deletion failed. Please try again.' });
      setDeleting(false);
      return;
    }
    // Always clear local auth state after successful account deletion,
    // regardless of whether the logout API call succeeds.
    await logout().catch(() => null);
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-[var(--bg3)] animate-pulse" />
          <div className="h-4 w-64 rounded bg-[var(--bg3)] animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg3)] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-[var(--bg3)] animate-pulse" />
            </div>
            <div className="h-px bg-[var(--line)]" />
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-[var(--bg3)] animate-pulse" />
              <div className="h-10 rounded-lg bg-[var(--bg3)] animate-pulse opacity-70" />
              <div className="h-8 w-28 rounded-lg bg-[var(--bg3)] animate-pulse opacity-50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold font-heading tracking-tight text-[var(--text)]">
          Profile & Settings
        </h1>
        <p className="text-sm text-[var(--text2)] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile info */}
      <section className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--c-api) 15%, transparent)' }}>
            <User className="w-4 h-4 text-[var(--c-api)]" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Profile</h2>
        </div>
        <Separator />
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--line2)] bg-[var(--bg3)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold font-heading text-[var(--muted)]">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                type="url"
                placeholder="https://…"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user.email} disabled className="opacity-60" />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savingProfile} size="sm">
              {savingProfile ? 'Saving…' : 'Save changes'}
            </Button>
            <span className="text-xs font-mono px-2 py-1 rounded border border-[var(--line2)] text-[var(--muted)]">
              {user.provider}
            </span>
          </div>
        </form>
      </section>

      {/* Change password — only for LOCAL accounts */}
      {user.provider === 'LOCAL' && (
        <section className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--c-db) 15%, transparent)' }}>
              <Lock className="w-4 h-4 text-[var(--c-db)]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Change Password</h2>
          </div>
          <Separator />
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword} size="sm">
              {savingPassword ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-[var(--bg1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--c-rt) 15%, transparent)' }}>
            <Bell className="w-4 h-4 text-[var(--c-rt)]" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Notifications</h2>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text)]">Feature announcements</p>
            <p className="text-xs text-[var(--text2)] mt-0.5">
              Get notified by email when new modules or features drop
            </p>
          </div>
          {loadingNewsletter ? (
            <div className="w-12 h-6 rounded-full bg-[var(--bg3)] animate-pulse" />
          ) : (
            <button
              onClick={handleNewsletterToggle}
              disabled={togglingNewsletter}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex items-center ${
                subscribed ? 'bg-[var(--c-api)]' : 'bg-[var(--bg3)] border border-[var(--line2)]'
              }`}
            >
              <span
                className={`absolute w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center ${
                  subscribed ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              >
                {subscribed
                  ? <Check className="w-2.5 h-2.5 text-[var(--c-api)]" />
                  : <X className="w-2.5 h-2.5 text-[var(--muted)]" />
                }
              </span>
            </button>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-red-950/20 border border-red-500/20 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        </div>
        <Separator className="bg-red-500/10" />

        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text)]">Delete account</p>
              <p className="text-xs text-[var(--text2)] mt-0.5">
                Permanently remove your account and all data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-300">
              Type <span className="font-mono font-semibold">delete my account</span> to confirm.
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="delete my account"
              className="border-red-500/30 focus:ring-red-500"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteInput !== 'delete my account' || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
