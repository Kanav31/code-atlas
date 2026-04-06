'use client';

import { Callout } from './Callout';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

interface BeginnerWarningProps {
  prerequisites: string[];
}

export function BeginnerWarning({ prerequisites }: BeginnerWarningProps) {
  const { beginnerMode } = useBeginnerModeContext();
  if (!beginnerMode) return null;
  return (
    <Callout type="warn" title="Expert content ahead">
      This tab assumes you have worked through the Understand content first.{' '}
      Key prerequisites: {prerequisites.join(', ')}.
    </Callout>
  );
}
