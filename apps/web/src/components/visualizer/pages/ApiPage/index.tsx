'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiUnderstand } from './ApiUnderstand';
import { ApiPlayground } from './ApiPlayground';
import { ApiDeepDive } from './ApiDeepDive';
import { ApiInterview } from './ApiInterview';

const COLOR = 'var(--c-api)';

export function ApiPage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="APIs"
        title="REST & gRPC"
        description="Understand why gRPC is ~10× faster than REST. Watch the packet travel, compare latency and payload size, and know exactly when to use each."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <ApiUnderstand />}
        {tab === 'play' && <ApiPlayground />}
        {tab === 'deepdive' && <ApiDeepDive />}
        {tab === 'interview' && <ApiInterview />}
      </div>
    </div>
  );
}
