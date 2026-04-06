'use client';

import Link from 'next/link';
import { Zap, Radio, Layers, Database, Server, HardDrive, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface HeroNode {
  id: string;
  left: number;
  top: number;
  color: string;
  pulseDelay: number;
  label: string;
  description: string;
  href: string;
  Icon: LucideIcon;
}

const HERO_NODES: HeroNode[] = [
  {
    id: 'api', left: 18, top: 38, color: '#10b981', pulseDelay: 0,
    label: 'REST & gRPC', Icon: Zap, href: '/dashboard/api',
    description: 'Compare REST and gRPC — latency, payload, streaming, and when to choose each.',
  },
  {
    id: 'rt', left: 40, top: 18, color: '#f59e0b', pulseDelay: 0.5,
    label: 'Real-time', Icon: Radio, href: '/dashboard/realtime',
    description: 'Short polling, long polling, WebSockets — see the efficiency difference live.',
  },
  {
    id: 'kafka', left: 68, top: 22, color: '#a855f7', pulseDelay: 1.0,
    label: 'Kafka', Icon: Layers, href: '/dashboard/kafka',
    description: 'Topics, partitions, offsets, and consumer groups visualized in real time.',
  },
  {
    id: 'db', left: 82, top: 55, color: '#3b82f6', pulseDelay: 0.8,
    label: 'Databases', Icon: Database, href: '/dashboard/database',
    description: 'Watch a B-tree index vs full table scan. Simulate ACID transactions.',
  },
  {
    id: 'scale', left: 55, top: 68, color: '#ef4444', pulseDelay: 1.4,
    label: 'Scalability', Icon: Server, href: '/dashboard/scalability',
    description: 'Load balancers, read replicas, and sharding — interactive architecture.',
  },
  {
    id: 'cache', left: 28, top: 72, color: '#8b5cf6', pulseDelay: 0.3,
    label: 'Caching', Icon: HardDrive, href: '/dashboard/caching',
    description: 'TTL, LRU eviction, and write-through — run cache hit/miss scenarios.',
  },
];

interface Props { isLoggedIn: boolean }

export function LandingHeroNodes({ isLoggedIn }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {HERO_NODES.map((node) => {
        const isHovered = isLoggedIn && hoveredId === node.id;

        const nodeInner = (
          <>
            {/* Pulse ring */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `1px solid ${node.color}`,
                animation: 'lp-pulse-ring 2.4s ease-out infinite',
                animationDelay: `${node.pulseDelay}s`,
                display: 'block',
              }}
            />
            {/* Dot */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `color-mix(in srgb, ${node.color} 12%, #080c10)`,
                border: `1.5px solid ${node.color}`,
                boxShadow: isHovered
                  ? `0 0 20px ${node.color}60`
                  : `0 0 12px ${node.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
            >
              <node.Icon size={16} color={node.color} />
            </span>
            {/* Label */}
            <span
              style={{
                position: 'absolute',
                top: 'calc(100% + 7px)',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 10,
                fontWeight: 500,
                color: node.color,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body), DM Sans, sans-serif',
                display: 'block',
              }}
            >
              {node.label}
            </span>

            {/* Tooltip — logged-in hover only */}
            {isHovered && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  // position above the node; flip below if node is near top
                  bottom: node.top < 35 ? 'auto' : 'calc(100% + 14px)',
                  top: node.top < 35 ? 'calc(100% + 14px)' : 'auto',
                  // flip left if node is near right edge
                  left: node.left > 65 ? 'auto' : '50%',
                  right: node.left > 65 ? '50%' : 'auto',
                  transform: node.left > 65
                    ? 'translateX(50%)'
                    : 'translateX(-50%)',
                  width: 180,
                  background: '#111720',
                  border: `0.5px solid ${node.color}33`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  zIndex: 30,
                  pointerEvents: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <p style={{
                  fontSize: 12, fontWeight: 600, color: node.color,
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  marginBottom: 5,
                }}>
                  {node.label}
                </p>
                <p style={{
                  fontSize: 11, color: '#6b7280', lineHeight: 1.5,
                  fontFamily: 'var(--font-body), DM Sans, sans-serif',
                }}>
                  {node.description}
                </p>
                <p style={{
                  marginTop: 8, fontSize: 10,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color: '#10b981',
                }}>
                  → click to enter
                </p>
              </div>
            )}
          </>
        );

        const baseStyle = {
          position: 'absolute' as const,
          left: `${node.left}%`,
          top: `${node.top}%`,
          width: 40,
          height: 40,
          transform: 'translate(-50%, -50%)',
        };

        if (isLoggedIn) {
          return (
            <Link
              key={node.id}
              href={node.href}
              style={{ ...baseStyle, textDecoration: 'none' }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {nodeInner}
            </Link>
          );
        }

        return (
          <div key={node.id} aria-hidden style={baseStyle}>
            {nodeInner}
          </div>
        );
      })}
    </>
  );
}
