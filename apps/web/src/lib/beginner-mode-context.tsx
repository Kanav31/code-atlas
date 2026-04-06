'use client';

import { createContext, useContext } from 'react';

export interface BeginnerModeContextValue {
  beginnerMode: boolean;
  toggleBeginnerMode: () => void;
}

export const BeginnerModeContext = createContext<BeginnerModeContextValue>({
  beginnerMode: false,
  toggleBeginnerMode: () => {},
});

export function useBeginnerModeContext(): BeginnerModeContextValue {
  return useContext(BeginnerModeContext);
}
