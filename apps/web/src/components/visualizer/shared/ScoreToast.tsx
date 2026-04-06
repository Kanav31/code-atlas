'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreToastProps {
  message: string | null;
  accentColor?: string;
}

export function ScoreToast({ message, accentColor = 'var(--c-api)' }: ScoreToastProps) {
  const [displayed, setDisplayed] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!message) return;
    setDisplayed(message);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message]);

  if (!displayed) return null;

  return (
    <div
      className="fixed bottom-36 right-5 z-50 px-4 py-2.5 rounded-xl text-[11px] font-mono pointer-events-none max-w-xs"
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${accentColor}`,
        color: accentColor,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.3s, transform 0.3s',
      }}
    >
      {displayed}
    </div>
  );
}
