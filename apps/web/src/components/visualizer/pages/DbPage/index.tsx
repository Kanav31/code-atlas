'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { DbUnderstand } from './DbUnderstand';
import { DbPlayground } from './DbPlayground';
import { DbDeepDive } from './DbDeepDive';
import { DbInterview } from './DbInterview';

const COLOR = 'var(--c-db)';

export function DbPage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Databases"
        title="Database & Indexing"
        description="Watch a full table scan visit every row, then see an index jump straight to the answer in 3 steps. Simulate ACID transactions with real rollback scenarios."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <DbUnderstand />}
        {tab === 'play'       && <DbPlayground />}
        {tab === 'deepdive'   && <DbDeepDive />}
        {tab === 'interview'  && <DbInterview />}
      </div>
    </div>
  );
}
