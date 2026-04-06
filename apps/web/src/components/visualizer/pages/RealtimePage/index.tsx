'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { RtUnderstand } from './RtUnderstand';
import { RtPlayground } from './RtPlayground';
import { RtDeepDive } from './RtDeepDive';
import { RtInterview } from './RtInterview';

const COLOR = 'var(--c-rt)';

export function RealtimePage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Real-time"
        title="Real-time & Sockets"
        description="See why WebSockets are more efficient than polling. Watch the wasted round trips, then watch a persistent connection deliver messages instantly."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <RtUnderstand />}
        {tab === 'play'       && <RtPlayground />}
        {tab === 'deepdive'   && <RtDeepDive />}
        {tab === 'interview'  && <RtInterview />}
      </div>
    </div>
  );
}
