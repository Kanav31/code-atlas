'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { CacheUnderstand } from './CacheUnderstand';
import { CachePlayground } from './CachePlayground';
import { CacheDeepDive } from './CacheDeepDive';
import { CacheInterview } from './CacheInterview';

const COLOR = 'var(--c-cache)';

export function CachePage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Caching"
        title="Caching"
        description="Watch TTL expiry count down, see LRU evict the least-used slot, and observe write-through synchronize cache and DB simultaneously."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <CacheUnderstand />}
        {tab === 'play'       && <CachePlayground />}
        {tab === 'deepdive'   && <CacheDeepDive />}
        {tab === 'interview'  && <CacheInterview />}
      </div>
    </div>
  );
}
