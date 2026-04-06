'use client';

import { useState } from 'react';
import { TabBar, type TabId } from '@/components/layout/TabBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { KafkaUnderstand } from './KafkaUnderstand';
import { KafkaPlayground } from './KafkaPlayground';
import { KafkaDeepDive } from './KafkaDeepDive';
import { KafkaInterview } from './KafkaInterview';

const COLOR = 'var(--c-kafka)';

export function KafkaPage() {
  const [tab, setTab] = useState<TabId>('understand');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        eyebrow="Messaging"
        title="Kafka & Queues"
        description="Watch messages route to partitions based on key hashing. See consumer groups share the workload and offsets advance in real time."
        accentColor={COLOR}
      />
      <TabBar active={tab} onChange={setTab} accentColor={COLOR} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'understand' && <KafkaUnderstand />}
        {tab === 'play'       && <KafkaPlayground />}
        {tab === 'deepdive'   && <KafkaDeepDive />}
        {tab === 'interview'  && <KafkaInterview />}
      </div>
    </div>
  );
}
