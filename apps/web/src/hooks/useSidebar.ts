'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ca_sidebar_collapsed';

function readStorage(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v !== null) return v === 'true';
  } catch {
    // SSR or storage blocked
  }
  return null;
}

function defaultCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = readStorage();
  if (stored !== null) return stored;
  // Tablet (<1024) starts collapsed; desktop starts expanded
  return window.innerWidth < 1024;
}

export function useSidebar() {
  const [collapsed, setCollapsedState] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setCollapsedState(defaultCollapsed());
    setMounted(true);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  // Close mobile overlay on resize to ≥768px
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close mobile overlay on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen, mounted };
}
