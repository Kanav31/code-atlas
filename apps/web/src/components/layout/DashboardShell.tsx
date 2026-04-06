'use client';

import { Sidebar, MobileMenuButton } from '@/components/layout/Sidebar';
import { NewsletterModal } from '@/components/NewsletterModal';
import { useSidebar } from '@/hooks/useSidebar';
import { useBeginnerMode } from '@/hooks/useBeginnerMode';
import { BeginnerModeContext } from '@/lib/beginner-mode-context';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { beginnerMode, toggleBeginnerMode, mounted: beginnerMounted } = useBeginnerMode();

  return (
    <BeginnerModeContext.Provider value={{ beginnerMode, toggleBeginnerMode }}>
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        beginnerMounted={beginnerMounted}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar — only visible on <768px */}
        <div className="md:hidden flex items-center h-[61px] px-4 border-b border-[var(--line)] bg-[var(--bg1)] flex-shrink-0 gap-3">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--c-api)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--bg)] font-bold text-[10px] font-heading">CA</span>
            </div>
            <span className="text-sm font-bold font-heading text-[var(--text)] tracking-tight">
              Code <span className="text-[var(--c-api)]">Atlas</span>
            </span>
          </div>
        </div>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          data-collapsed={String(collapsed)}
        >
          {children}
        </main>
      </div>

      <NewsletterModal />
    </div>
    </BeginnerModeContext.Provider>
  );
}
