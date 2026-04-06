export interface GlossaryEntry {
  short: string;
  analogy?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'TCP handshake': {
    short: 'A 3-step greeting computers exchange before sending data.',
    analogy: 'Like ringing a doorbell and waiting for the door to open before you speak.',
  },
  'Protobuf': {
    short: 'A compact binary format for sending data — smaller and faster than JSON.',
    analogy: 'Like using shorthand codes instead of writing full words every time.',
  },
  'HTTP/2': {
    short: 'The second version of the web protocol — lets multiple requests share one connection simultaneously.',
    analogy: 'Like a highway with many lanes vs. a single-lane road that handles one car at a time.',
  },
  'multiplexed': {
    short: 'Multiple requests sharing one connection at the same time.',
    analogy: 'Like many phone calls sharing the same fiber cable instead of needing separate wires.',
  },
  'partition': {
    short: 'A slice of a Kafka topic — an ordered, append-only log of messages.',
    analogy: 'Like a specific lane on a highway — traffic in each lane stays in order.',
  },
  'offset': {
    short: 'A sequential number marking your position in a Kafka partition.',
    analogy: 'Like a bookmark — tells you exactly which message you last read.',
  },
  'consumer group': {
    short: 'A set of services that jointly read a Kafka topic, each owning some partitions.',
    analogy: 'Like a team of readers splitting chapters of a book — each person covers their own section.',
  },
  'replication factor': {
    short: 'How many copies of each Kafka partition exist across brokers.',
    analogy: 'Like having backup copies of a document on separate hard drives.',
  },
  'shard': {
    short: 'A horizontal slice of a database — each shard holds a subset of the rows.',
    analogy: 'Like splitting a phone book into A–M and N–Z so each half is smaller and faster to search.',
  },
  'load balancer': {
    short: 'A router that spreads incoming requests across multiple servers.',
    analogy: 'Like a traffic cop directing cars into different lanes to prevent one from jamming up.',
  },
  'read replica': {
    short: 'A copy of the database that handles read requests, taking pressure off the primary.',
    analogy: 'Like making photocopies of a popular book so more people can read it at once.',
  },
  'backpressure': {
    short: 'A signal from a slow consumer telling the producer to slow down.',
    analogy: 'Like a kitchen telling the waiter to stop taking new orders until the current ones are ready.',
  },
  'TTL': {
    short: 'Time To Live — how long a cached value stays valid before it is deleted automatically.',
    analogy: 'Like a sell-by date on food — after it expires, fresh data must be fetched from the source.',
  },
  'LRU eviction': {
    short: 'Least Recently Used — when the cache is full, the oldest-accessed item is removed first.',
    analogy: 'Like clearing the least-used apps from your phone to free up memory.',
  },
  'idempotent': {
    short: 'Safe to repeat — sending the same request twice produces no extra side effects.',
    analogy: 'Like pressing a light switch that is already on — nothing bad happens if you press it again.',
  },
  'B-tree index': {
    short: 'A sorted tree structure that lets the database find rows in O(log n) steps instead of scanning every row.',
    analogy: 'Like a book index — you look up the page number first instead of reading every page.',
  },
  'WAL': {
    short: 'Write-Ahead Log — changes are written to a log before the actual data, enabling crash recovery.',
    analogy: 'Like noting what you plan to do in a notebook before doing it, so you can redo it if interrupted.',
  },
};
