'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true the first time a given key is seen in localStorage.
 * After the returned `markSeen` is called, subsequent renders return false.
 */
export function useFirstVisit(key: string): { isFirstVisit: boolean; markSeen: () => void; mounted: boolean } {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(key);
      setIsFirstVisit(!seen);
    } catch {
      setIsFirstVisit(false);
    }
    setMounted(true);
  }, [key]);

  function markSeen() {
    try {
      localStorage.setItem(key, '1');
    } catch {
      // ignore
    }
    setIsFirstVisit(false);
  }

  return { isFirstVisit, markSeen, mounted };
}
