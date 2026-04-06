'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScaleUnderstand } from './ScaleUnderstand';
import { ScalePlayground } from './ScalePlayground';
import { ScaleDeepDive } from './ScaleDeepDive';
import { ScaleInterview } from './ScaleInterview';

const COLOR = 'var(--c-scale)';

export function ScalePage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Infrastructure"
        title="Scalability"
        description="Simulate least-connections load balancing, primary-replica read routing, and hash-based sharding. See where each request lands and why."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <ScaleUnderstand />}
        {tab === 'play'       && <ScalePlayground />}
        {tab === 'deepdive'   && <ScaleDeepDive />}
        {tab === 'interview'  && <ScaleInterview />}
      </div>
    </div>
  );
}
