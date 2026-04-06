'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ca_beginner_mode';
const VISITED_KEY = 'ca_visited';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // SSR or storage blocked
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export interface BeginnerModeReturn {
  beginnerMode: boolean;
  toggleBeginnerMode: () => void;
  setBeginnerMode: (value: boolean) => void;
  mounted: boolean;
}

export function useBeginnerMode(): BeginnerModeReturn {
  const [beginnerMode, setBeginnerModeState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = readStorage(STORAGE_KEY);
    if (stored !== null) {
      // User has an explicit preference
      setBeginnerModeState(stored === 'true');
    } else {
      // First-visit heuristic: new users default to beginner mode
      const hasVisited = readStorage(VISITED_KEY);
      if (!hasVisited) {
        setBeginnerModeState(true);
        writeStorage(STORAGE_KEY, 'true');
        writeStorage(VISITED_KEY, '1');
      }
    }
    setMounted(true);
  }, []);

  const setBeginnerMode = useCallback((value: boolean) => {
    setBeginnerModeState(value);
    writeStorage(STORAGE_KEY, String(value));
  }, []);

  const toggleBeginnerMode = useCallback(() => {
    setBeginnerMode(!beginnerMode);
  }, [beginnerMode, setBeginnerMode]);

  return { beginnerMode, toggleBeginnerMode, setBeginnerMode, mounted };
}
