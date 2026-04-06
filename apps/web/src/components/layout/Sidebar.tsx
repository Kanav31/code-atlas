'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  Zap,
  Radio,
  Layers,
  Database,
  Server,
  HardDrive,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

const NAV_ITEMS = [
  { href: '/dashboard/api',         label: 'REST & gRPC',   icon: Zap,      color: 'var(--c-api)'   },
  { href: '/dashboard/realtime',    label: 'Real-time',     icon: Radio,    color: 'var(--c-rt)'    },
  { href: '/dashboard/kafka',       label: 'Kafka & Queues', icon: Layers,  color: 'var(--c-queue)' },
  { href: '/dashboard/database',    label: 'Databases',     icon: Database, color: 'var(--c-db)'    },
  { href: '/dashboard/scalability', label: 'Scalability',   icon: Server,   color: 'var(--c-scale)' },
  { href: '/dashboard/caching',     label: 'Caching',       icon: HardDrive, color: 'var(--c-cache)' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  beginnerMounted: boolean;
}

// Tooltip shown on the right of the icon when the sidebar is collapsed
function NavTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50',
        'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap',
        'bg-[var(--bg3)] border border-[var(--line2)] text-[var(--text)]',
        'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100',
        'transition-all duration-150',
        'shadow-lg shadow-black/30',
      )}
    >
      {label}
    </span>
  );
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, beginnerMounted }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { beginnerMode, toggleBeginnerMode } = useBeginnerModeContext();

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[var(--bg1)] border-r border-[var(--line)]',
        'transition-[width] duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-[64px]' : 'w-[260px]',
      )}
      aria-label="Sidebar navigation"
    >
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <Link
        href="/"
        className={cn(
          'flex items-center border-b border-[var(--line)] flex-shrink-0 h-[61px]',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2.5',
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--c-api)] flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--bg)] font-bold text-sm font-heading">CA</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold font-heading text-[var(--text)] tracking-tight truncate">
            Code <span className="text-[var(--c-api)]">Atlas</span>
          </span>
        )}
      </Link>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')} aria-label="Modules">
        {!collapsed && (
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--dim)] font-mono select-none">
            Modules
          </p>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all',
                  collapsed ? 'justify-center w-full h-10 px-0' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-[var(--bg3)] text-[var(--text)]'
                    : 'text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]',
                )}
              >
                {/* Accent dot — hidden when collapsed */}
                {!collapsed && (
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
                      isActive ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-60',
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                )}

                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? item.color : undefined }}
                />

                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

                {!collapsed && isActive && (
                  <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                )}
              </Link>

              {/* Tooltip — only in collapsed mode */}
              {collapsed && <NavTooltip label={item.label} />}
            </div>
          );
        })}
      </nav>

      {/* ── Beginner Mode toggle ──────────────────────────────────────── */}
      <div className={cn('border-t border-[var(--line)] py-3 flex-shrink-0', collapsed ? 'px-2' : 'px-3')}>
        {!beginnerMounted ? (
          // Skeleton to prevent layout shift before localStorage hydrates
          <div className="h-10 rounded-lg bg-[var(--bg3)] opacity-40" />
        ) : collapsed ? (
          <div className="relative group">
            <button
              type="button"
              onClick={toggleBeginnerMode}
              aria-label={beginnerMode ? 'Disable Beginner Mode' : 'Enable Beginner Mode'}
              className={cn(
                'w-full flex items-center justify-center h-10 rounded-lg transition-all',
                beginnerMode
                  ? 'bg-[color-mix(in_srgb,var(--c-api)_12%,transparent)]'
                  : 'hover:bg-[var(--bg2)]',
              )}
              style={beginnerMode ? { border: '1px solid color-mix(in srgb, var(--c-api) 30%, transparent)' } : {}}
            >
              <GraduationCap
                className="w-4 h-4"
                style={{ color: beginnerMode ? 'var(--c-api)' : 'var(--muted)' }}
              />
            </button>
            <NavTooltip label={beginnerMode ? 'Beginner Mode: ON' : 'Beginner Mode: OFF'} />
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleBeginnerMode}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
              beginnerMode
                ? 'bg-[color-mix(in_srgb,var(--c-api)_8%,transparent)]'
                : 'hover:bg-[var(--bg2)]',
            )}
            style={beginnerMode ? { border: '1px solid color-mix(in srgb, var(--c-api) 20%, transparent)' } : { border: '1px solid transparent' }}
          >
            <GraduationCap
              className="w-4 h-4 flex-shrink-0"
              style={{ color: beginnerMode ? 'var(--c-api)' : 'var(--muted)' }}
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium" style={{ color: beginnerMode ? 'var(--text)' : 'var(--text2)' }}>
                Beginner Mode
              </p>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {beginnerMode ? 'Slower speed · more context' : 'Off — expert speed'}
              </p>
            </div>
            {/* Pill indicator */}
            <div
              className="w-8 h-4 rounded-full flex-shrink-0 flex items-center transition-all"
              style={{
                background: beginnerMode
                  ? 'var(--c-api)'
                  : 'var(--bg3)',
                paddingInline: 3,
                justifyContent: beginnerMode ? 'flex-end' : 'flex-start',
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white opacity-90" />
            </div>
          </button>
        )}
      </div>

      {/* ── User section ──────────────────────────────────────────────── */}
      <div className={cn('border-t border-[var(--line)] py-3 space-y-1 flex-shrink-0', collapsed ? 'px-2' : 'px-3')}>
        {/* Profile link */}
        <div className="relative group">
          <Link
            href="/dashboard/profile"
            aria-label="Profile"
            className={cn(
              'flex items-center rounded-lg text-sm text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-all',
              collapsed ? 'justify-center h-10 px-0' : 'gap-3 px-3 py-2.5',
            )}
          >
            <div className="w-7 h-7 rounded-full bg-[var(--bg3)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{user?.name ?? 'Profile'}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">{user?.email}</p>
              </div>
            )}
          </Link>
          {collapsed && <NavTooltip label={user?.name ?? 'Profile'} />}
        </div>

        {/* Sign out */}
        <div className="relative group">
          <button
            onClick={logout}
            aria-label="Sign out"
            className={cn(
              'w-full flex items-center rounded-lg text-sm text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-red-400 transition-all',
              collapsed ? 'justify-center h-10 px-0' : 'gap-3 px-3 py-2.5',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          {collapsed && <NavTooltip label="Sign out" />}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop / Tablet: static sidebar ─────────────────────────── */}
      <div className="hidden md:block relative h-screen flex-shrink-0">
        {sidebarContent}

        {/* Toggle button — rides the right border, centered in the header */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          style={{ top: '10px' }}
          className={cn(
            'absolute -right-3 z-20',
            'flex items-center justify-center w-6 h-6 rounded-full',
            'p-5',
            'bg-[var(--bg1)] border border-[var(--line2)]',
            'text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--line2)]',
            'hover:bg-[var(--bg3)]',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-api)]',
            'shadow-[0_1px_4px_rgba(0,0,0,0.4)]',
          )}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Mobile: overlay drawer ────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={cn(
          'md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
        onClick={onMobileClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 h-full',
          'transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Force expanded in mobile overlay */}
        <aside className="flex flex-col h-full w-[260px] bg-[var(--bg1)] border-r border-[var(--line)]">
          {/* Mobile header with close */}
          <div className="flex items-center justify-between h-[61px] px-4 border-b border-[var(--line)]">
            <Link href="/" onClick={onMobileClose} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--c-api)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--bg)] font-bold text-sm font-heading">CA</span>
              </div>
              <span className="text-lg font-bold font-heading text-[var(--text)] tracking-tight">
                Code <span className="text-[var(--c-api)]">Atlas</span>
              </span>
            </Link>
            <button
              onClick={onMobileClose}
              aria-label="Close navigation menu"
              className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-api)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Modules">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--dim)] font-mono select-none">
              Modules
            </p>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-[var(--bg3)] text-[var(--text)]'
                      : 'text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]',
                  )}
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
                      isActive ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-60',
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? item.color : undefined }} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="border-t border-[var(--line)] p-3 space-y-1">
            <Link
              href="/dashboard/profile"
              onClick={onMobileClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--bg3)] border border-[var(--line2)] flex items-center justify-center flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[var(--muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{user?.name ?? 'Profile'}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={() => { logout(); onMobileClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign out
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

// Standalone hamburger button rendered in the mobile top bar
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open navigation menu"
      aria-haspopup="dialog"
      className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-api)]"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
