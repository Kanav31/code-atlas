'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal, type LogLine } from '@/components/visualizer/shared/Terminal';
import { InputBar } from '@/components/visualizer/shared/InputBar';
import { StepBar } from '@/components/visualizer/shared/StepBar';
import { ScoreToast } from '@/components/visualizer/shared/ScoreToast';
import { sleep, rand, pick, ts } from '@/lib/utils';
import { SimDisclaimer } from '@/components/visualizer/shared/SimDisclaimer';
import { WhatHappenedPanel } from '@/components/visualizer/shared/WhatHappenedPanel';
import { PlaygroundHint } from '@/components/visualizer/shared/PlaygroundHint';
import { useBeginnerModeContext } from '@/lib/beginner-mode-context';

const COLOR = 'var(--c-rt)';
type Mode = 'short' | 'long' | 'ws';

let _id = 0;
const lid = () => String(++_id);

type Packet = {
  id: string; label: string; color: string; textColor: string;
  fromXPct: number; toXPct: number; yPct: number; active: boolean; dur: number;
};

type ChatMsg = {
  id: string; from: string; avatar: string; avatarColor: string;
  text: string; side: 'left' | 'right' | 'system'; time: string; delivered?: boolean;
};

const ALICE = { name: 'Alice', avatar: 'A', color: '#a78bfa' };
const BOB   = { name: 'Bob',   avatar: 'B', color: '#34d399' };

// ─── Example chips per mode ────────────────────────────────────────────────────

const EXAMPLES: Record<Mode, Array<{ icon: string; cmd: string; label: string; hint: string }>> = {
  short: [
    { icon: '💬', cmd: 'new messages?',  label: 'Check messages',   hint: 'Chat polling'         },
    { icon: '⚽', cmd: 'live scores?',   label: 'Live scores',      hint: 'Sports score poll'    },
    { icon: '📦', cmd: 'order status?',  label: 'Order status',     hint: 'E-commerce polling'   },
    { icon: '🔔', cmd: 'notifications?', label: 'Notifications',    hint: 'Alert polling'        },
  ],
  long: [
    { icon: '💬', cmd: 'wait for message', label: 'Hold for chat',   hint: 'Message delivery'    },
    { icon: '🚚', cmd: 'wait for delivery', label: 'Order update',   hint: 'Event-driven update' },
    { icon: '⚙️', cmd: 'await task done',  label: 'Background job', hint: 'Async task result'   },
    { icon: '📈', cmd: 'wait for alert',   label: 'Stock alert',    hint: 'Price threshold hit'  },
  ],
  ws: [
    { icon: '👋', cmd: 'Hey! 👋',           label: 'Say hi',         hint: 'Open with a greeting' },
    { icon: '🏓', cmd: 'ping',              label: 'Ping',           hint: 'Classic WS test'      },
    { icon: '⚡', cmd: 'this is so fast!',  label: 'React to speed', hint: 'Feel the latency'     },
    { icon: '🤔', cmd: 'how does WS work?', label: 'Ask about WS',   hint: 'See bot reply'        },
  ],
};

// ─── Bot replies ───────────────────────────────────────────────────────────────

function pickBotReply(msg: string): { bot: typeof ALICE; text: string } {
  const t = msg.toLowerCase();
  if (/\b(hi|hey|hello|howdy|sup)\b/.test(t))
    return Math.random() > 0.5
      ? { bot: ALICE, text: 'Hey! 👋' }
      : { bot: BOB,   text: 'yo! 👋' };
  if (/\bhow are you\b/.test(t))    return { bot: ALICE, text: 'doing great! WebSockets keep me fast 🚀' };
  if (/\bping\b/.test(t))           return { bot: BOB,   text: 'pong! 🏓' };
  if (/\blol|haha|lmao|😂/.test(t)) return { bot: BOB,   text: '😂 right?' };
  if (/\btest\b/.test(t))           return { bot: ALICE, text: 'got it ✓' };
  if (/\bfast|speed|latency/.test(t)) return { bot: ALICE, text: '⚡ yeah, ~6ms round-trip. No polling overhead!' };
  if (/\bhow does ws work/.test(t)) return { bot: BOB, text: 'One HTTP Upgrade → persistent TCP tunnel. Then frames in microseconds 🔥' };
  if (/\bwhy\b/.test(t))            return { bot: ALICE, text: 'good question 🤔' };
  if (/\bwebsocket|ws\b/.test(t))   return { bot: ALICE, text: 'zero-overhead real-time! ⚡' };
  if (/\bcool|nice|awesome|great\b/.test(t)) return { bot: BOB, text: '💯 agreed' };
  return pick([
    { bot: ALICE, text: 'nice! 👍' },
    { bot: BOB,   text: 'makes sense' },
    { bot: ALICE, text: 'agreed 💯' },
    { bot: BOB,   text: 'got it' },
    { bot: ALICE, text: '100%' },
    { bot: BOB,   text: '👀 interesting' },
  ]);
}

// ─── Main component ────────────────────────────────────────────────────────────

export function RtPlayground() {
  const [mode, setMode] = useState<Mode>('short');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [glows, setGlows] = useState<Set<string>>(new Set());
  const [step, setStepState] = useState({ total: 4, current: -1, label: 'Pick an example below or type a message' });
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [wastedCount, setWastedCount] = useState(0);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const { beginnerMode } = useBeginnerModeContext();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, typingUser]);

  function setStep(current: number, label: string, total = 4) {
    setStepState({ total, current, label });
  }

  function pulseGlow(id: string) {
    setGlows((s) => new Set([...s, id]));
    setTimeout(() => setGlows((s) => { const n = new Set(s); n.delete(id); return n; }), 1200);
  }

  function showScore(msg: string) {
    setScoreMsg(null);
    setTimeout(() => setScoreMsg(msg), 10);
  }

  function addChat(msg: Omit<ChatMsg, 'id' | 'time'>) {
    setChatMsgs((prev) => [...prev, { ...msg, id: lid(), time: ts() }]);
  }

  async function slowLine(tag: string, tagColor: string, message: string, ms = 380) {
    setLines((prev) => [...prev, { id: lid(), tag, tagColor, message, timestamp: ts() }]);
    await sleep(ms);
  }

  async function flyPkt(
    fromXPct: number, toXPct: number, yPct: number,
    label: string, color: string, textColor: string, dur = 550,
  ) {
    const id = `p${Date.now()}${Math.random()}`;
    setPackets((prev) => [...prev, { id, label, color, textColor, fromXPct, toXPct, yPct, active: false, dur }]);
    await sleep(32);
    setPackets((prev) => prev.map((p) => p.id === id ? { ...p, active: true } : p));
    await sleep(dur + 80);
    setPackets((prev) => prev.filter((p) => p.id !== id));
  }

  async function showTyping(name: string, durationMs: number) {
    setTypingUser(name);
    await sleep(durationMs);
    setTypingUser(null);
  }

  // ─── Short Polling execution ─────────────────────────────────────────────────

  async function runShortPoll(msg: string) {
    const polls = rand(2, 4);
    setWastedCount((c) => c + polls);
    setStep(0, 'Polling — client asking repeatedly, hoping for an answer…', 4);

    for (let i = 0; i < polls; i++) {
      pulseGlow('client');
      await slowLine('POLL', COLOR, `GET /events  (attempt ${i + 1} of ${polls + 1})`, 320);
      await slowLine('WHY', 'var(--muted)', '↳ Client has no idea if data exists — it just asks again', 300);
      await flyPkt(22, 78, 45, 'GET /events', COLOR, '#000', 500);
      await sleep(rand(80, 160));
      await flyPkt(78, 22, 55, '204 No Content', '#241600', COLOR, 500);
      await slowLine('204', 'var(--muted)', `No Content — no new events (wasted round-trip #${i + 1})`, 340);
      await slowLine('IMP', '#f87171', `↳ IMPACT: ${i + 1} request${i > 0 ? 's' : ''} sent, 0 data received. Every user is doing this.`, 380);
      await sleep(rand(500, 800));
    }

    setStep(2, 'Data finally arrived — after multiple wasted round-trips…');
    pulseGlow('client');
    await slowLine('POLL', COLOR, `GET /events  (attempt ${polls + 1} of ${polls + 1}) — data ready this time`, 360);
    await flyPkt(22, 78, 45, 'GET /events', COLOR, '#000', 500);
    await sleep(rand(80, 160));
    await flyPkt(78, 22, 55, '200 OK + data', '#241600', COLOR, 500);
    pulseGlow('client');
    await slowLine('200', 'var(--c-api)', `{"event":"message","data":"${msg}"}`, 400);
    await slowLine('IMP', '#f87171', `↳ ${polls} wasted requests for 1 useful one — ${Math.round((polls / (polls + 1)) * 100)}% of traffic was overhead`, 440);

    setStep(3, `Done — ${polls} wasted requests · ${polls + 1} total round-trips for 1 message`);
    await slowLine('───', 'var(--line)', '─────────────── Summary ───────────────', 200);
    await slowLine('SUM', '#f87171', `Short Poll │ ${polls + 1} HTTP requests · ${polls} empty · TCP closed after each`, 380);
    await slowLine('SUM', 'var(--c-api)', `WebSocket  │ 1 persistent frame · 0 wasted · ~6ms total`, 380);
    await slowLine('INS', '#fbbf24', `↳ At 1,000 users polling every 2s: ${(1000 * 0.5).toLocaleString()} req/s — ${Math.round((polls / (polls + 1)) * 100)}% of them empty`, 400);

    showScore(`Short poll: ${polls + 1} round-trips · ${polls} wasted · ${Math.round((polls / (polls + 1)) * 100)}% overhead`);
  }

  // ─── Long Polling execution ──────────────────────────────────────────────────

  async function runLongPoll(msg: string) {
    setStep(0, 'Client sends request — server will hold it open until data arrives…', 3);
    pulseGlow('client');
    await slowLine('REQ', COLOR, 'GET /events  (server will hold this connection open…)', 400);
    await slowLine('WHY', 'var(--muted)', '↳ WHY: Instead of closing immediately, server keeps the TCP connection alive until it has data to send', 440);
    await flyPkt(22, 78, 50, 'GET /events (hold…)', COLOR, '#000', 600);
    pulseGlow('server');

    const hold = rand(800, 1800);
    setStep(1, `Server holding connection — waiting for data (~${hold}ms)…`);
    await slowLine('HLD', 'var(--muted)', 'Server holding connection open… no response yet', 420);
    await sleep(hold / 3);
    await slowLine('HLD', 'var(--muted)', '  still waiting… (connection is open, server is silent)', 400);
    await sleep(hold / 3);
    await slowLine('HLD', 'var(--muted)', '  still waiting… (data not ready yet)', 400);
    await sleep(hold / 3);

    setStep(2, 'Data ready — server responds and closes connection');
    await slowLine('200', 'var(--c-api)', `{"event":"message","data":"${msg}"}  — after ${hold}ms hold`, 440);
    await flyPkt(78, 22, 50, '200 OK + data', '#241600', COLOR, 600);
    pulseGlow('client');
    await slowLine('INF', 'var(--muted)', 'Connection closed — client immediately opens a new long-poll', 400);
    await slowLine('IMP', '#fbbf24', '↳ IMPACT: 0 wasted responses. But each message still costs 1 new TCP connection + full HTTP headers.', 460);
    await slowLine('CMP', 'var(--c-api)', '↳ WebSocket: same message arrives in ~6ms, 2 bytes of framing, connection never closes', 440);

    await slowLine('───', 'var(--line)', '─────────────── Summary ───────────────', 200);
    await slowLine('SUM', COLOR, `Long Poll  │ ${hold}ms hold · 0 wasted · 1 TCP per message`, 380);
    await slowLine('SUM', 'var(--c-api)', `WebSocket  │ ~6ms · 0 wasted · 0 new TCP connections ever`, 380);
    await slowLine('INS', '#fbbf24', '↳ At 10K users each holding a long-poll: 10K simultaneous open HTTP connections on your server', 400);

    showScore(`Long poll: ${hold}ms hold · 1 TCP per message · no wasted requests`);
  }

  // ─── WebSocket execution ─────────────────────────────────────────────────────

  async function runWS(msg: string) {
    if (!wsConnected) {
      // Handshake
      setStep(0, 'HTTP Upgrade handshake — one-time cost to open the tunnel…', 4);
      pulseGlow('you');
      setLines((p) => [...p, { id: lid(), tag: 'SYN', tagColor: COLOR, message: 'GET /ws  Upgrade: websocket  Connection: Upgrade', timestamp: ts() }]);
      await flyPkt(13, 48, 50, 'GET /ws  Upgrade: websocket', COLOR, '#000', 580);
      pulseGlow('server');
      await sleep(60);
      await flyPkt(48, 13, 50, '101 Switching Protocols ✓', '#241600', COLOR, 580);
      pulseGlow('you');
      setLines((p) => [...p, { id: lid(), tag: '101', tagColor: 'var(--c-api)', message: 'WebSocket tunnel established — persistent, full-duplex', timestamp: ts() }]);

      // Notify Alice & Bob
      await Promise.all([
        flyPkt(48, 73, 38, 'peer joined', '#241600', ALICE.color, 420),
        flyPkt(48, 88, 62, 'peer joined', '#241600', BOB.color,   420),
      ]);
      pulseGlow('alice');
      pulseGlow('bob');

      setWsConnected(true);
      setStep(1, 'Tunnel open — zero overhead per message from now on…');

      addChat({ from: '', avatar: '', avatarColor: '', text: '🔌 You joined #general · Alice and Bob are here', side: 'system' });
      await sleep(300);
      await showTyping('Alice', 700);
      addChat({ from: ALICE.name, avatar: ALICE.avatar, avatarColor: ALICE.color, text: 'Hey! 👋', side: 'left' });
      await sleep(300);
      await showTyping('Bob', 500);
      addChat({ from: BOB.name, avatar: BOB.avatar, avatarColor: BOB.color, text: "what's up", side: 'left' });
      await sleep(200);
    }

    // Your message
    setStep(2, 'Your frame travels to server — no HTTP overhead, ~2 bytes framing…', 4);
    pulseGlow('you');
    setLines((p) => [...p, { id: lid(), tag: 'WS↑', tagColor: COLOR, message: `frame [text]: "${msg}"  — ~${msg.length + 2}B total (vs ~${msg.length + 480}B via HTTP)`, timestamp: ts() }]);
    addChat({ from: 'You', avatar: 'Y', avatarColor: COLOR, text: msg, side: 'right' });

    const rtt = rand(5, 18);
    await flyPkt(13, 48, 50, `▶ "${msg.slice(0, 18)}"`, COLOR, '#000', 340);
    pulseGlow('server');
    await sleep(rtt);

    // Broadcast
    setStep(3, 'Server broadcasts to ALL connected clients simultaneously…', 4);
    setLines((p) => [...p, { id: lid(), tag: 'WS↓', tagColor: 'var(--c-api)', message: `broadcast → Alice, Bob: "${msg}"  (${rtt}ms total RTT)`, timestamp: ts() }]);

    await Promise.all([
      flyPkt(48, 73, 38, `▶ "${msg.slice(0, 10)}"`, '#241600', ALICE.color, 380),
      flyPkt(48, 88, 62, `▶ "${msg.slice(0, 10)}"`, '#241600', BOB.color,   380),
    ]);
    pulseGlow('alice');
    pulseGlow('bob');

    // Mark delivered
    setChatMsgs((prev) => {
      const copy = [...prev];
      const last = copy.findLastIndex((m) => m.side === 'right');
      if (last !== -1) copy[last] = { ...copy[last], delivered: true } as ChatMsg;
      return copy;
    });

    showScore(`WebSocket: ~${rtt}ms · broadcast to 2 clients · 0 wasted requests`);

    // Bot replies
    await sleep(rand(500, 900));
    const { bot, text } = pickBotReply(msg);
    await showTyping(bot.name, rand(600, 900));
    addChat({ from: bot.name, avatar: bot.avatar, avatarColor: bot.color, text, side: 'left' });

    flyPkt(bot.name === 'Alice' ? 73 : 88, 48, bot.name === 'Alice' ? 38 : 62,
      `▶ "${text.slice(0, 12)}"`, '#241600', bot.color, 320)
      .then(() => flyPkt(48, 13, 50, `▶ "${text.slice(0, 12)}"`, '#241600', bot.color, 320))
      .catch(() => {/* ignore */});
  }

  // ─── Send handler ─────────────────────────────────────────────────────────────

  async function handleSend(override?: string) {
    if (busy) return;
    const msg = override ?? (input.trim() || (mode === 'ws' ? 'ping' : 'check for updates'));
    setInput('');

    // Clear previous run
    if (mode !== 'ws') {
      setLines([]);
      setPackets([]);
      setGlows(new Set());
      setStepState({ total: 4, current: -1, label: 'Pick an example below or type a message' });
      setScoreMsg(null);
    }

    setBusy(true);

    if (mode === 'short') {
      await runShortPoll(msg);
    } else if (mode === 'long') {
      await runLongPoll(msg);
    } else {
      await runWS(msg);
    }

    setBusy(false);
  }

  function resetState(m: string) {
    setMode(m as Mode);
    setLines([]);
    setPackets([]);
    setGlows(new Set());
    setWsConnected(false);
    setWastedCount(0);
    setChatMsgs([]);
    setTypingUser(null);
    setStepState({ total: 4, current: -1, label: 'Pick an example below or type a message' });
    setScoreMsg(null);
    setLogsExpanded(false);
  }

  // ─── Node layout ──────────────────────────────────────────────────────────────

  const wsNodes = [
    { id: 'you',    icon: '💻', title: 'You',    sub: 'browser',   xPct: 12 },
    { id: 'server', icon: '🖥️', title: 'Server', sub: 'WS server', xPct: 50 },
    { id: 'alice',  icon: '👤', title: 'Alice',  sub: 'browser',   xPct: 73 },
    { id: 'bob',    icon: '👤', title: 'Bob',    sub: 'browser',   xPct: 88 },
  ];
  const httpNodes = [
    { id: 'client', icon: '💻', title: 'Client', sub: 'browser', xPct: 14 },
    { id: 'server', icon: '🖥️', title: 'Server', sub: 'HTTP',    xPct: 86 },
  ];
  const nodes = mode === 'ws' ? wsNodes : httpNodes;

  const examples = EXAMPLES[mode];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <ScoreToast message={scoreMsg} accentColor={COLOR} />

      <div className="p-6 flex flex-col gap-3">
        {/* Visualization box */}
        <div className="bg-[var(--bg1)] rounded-xl border border-[var(--line)] overflow-hidden flex flex-col">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)] bg-[var(--bg2)] flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-xs font-mono text-[var(--muted)]">
              {mode === 'ws' && wsConnected ? 'ws://chat.example.com  [CONNECTED]' : 'realtime.example.com'}
            </span>
            {mode === 'ws' && wsConnected && (
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ color: 'var(--c-api)', background: 'color-mix(in srgb, var(--c-api) 12%, transparent)' }}>
                ● live
              </span>
            )}
            {mode === 'short' && wastedCount > 0 && (
              <span className="ml-auto text-[10px] font-mono" style={{ color: '#f87171' }}>
                {wastedCount} wasted requests so far
              </span>
            )}
            {busy && mode !== 'ws' && (
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${COLOR} 15%, transparent)`, color: COLOR }}>
                simulating...
              </span>
            )}
          </div>

          {/* Animated node strip */}
          <div
            className="relative bg-[var(--bg)] flex-shrink-0"
            style={{ height: mode === 'ws' ? 130 : 120 }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.3,
              }}
            />

            {/* SVG connections */}
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              {mode === 'ws' ? (
                <>
                  <line x1="16%" y1="50%" x2="46%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
                  <line x1="54%" y1="50%" x2="70%" y2="35%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
                  <line x1="54%" y1="50%" x2="85%" y2="65%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
                </>
              ) : (
                <line x1="19%" y1="50%" x2="81%" y2="50%" stroke="var(--line2)" strokeWidth={1} strokeDasharray="4 4" />
              )}
            </svg>

            {nodes.map((node) => {
              const nodeColor = node.id === 'alice' ? ALICE.color : node.id === 'bob' ? BOB.color : COLOR;
              const isGlowing = glows.has(node.id);
              const yOverride = node.id === 'alice' ? '35%' : node.id === 'bob' ? '65%' : '50%';
              return (
                <div
                  key={node.id}
                  className="absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                  style={{
                    left: `${node.xPct}%`,
                    top: mode === 'ws' ? yOverride : '50%',
                    transform: 'translate(-50%, -50%)',
                    width: node.id === 'alice' || node.id === 'bob' ? 60 : 68,
                    height: node.id === 'alice' || node.id === 'bob' ? 56 : 64,
                    background: 'var(--bg2)',
                    borderColor: isGlowing ? nodeColor : 'var(--line2)',
                    boxShadow: isGlowing ? `0 0 0 4px color-mix(in srgb, ${nodeColor} 22%, transparent)` : undefined,
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                >
                  <div className="text-lg leading-none">{node.icon}</div>
                  <div
                    className="text-[10px] font-bold text-center leading-tight"
                    style={{ color: (node.id === 'alice' || node.id === 'bob') ? nodeColor : 'var(--text)' }}
                  >
                    {node.title}
                  </div>
                  <div className="text-[9px] font-mono text-[var(--muted)] text-center leading-tight">{node.sub}</div>
                </div>
              );
            })}

            {packets.map((pkt) => (
              <div
                key={pkt.id}
                className="absolute pointer-events-none z-20 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap"
                style={{
                  left: pkt.active ? `${pkt.toXPct}%` : `${pkt.fromXPct}%`,
                  top: `${pkt.yPct}%`,
                  transform: 'translateY(-50%)',
                  background: pkt.color,
                  color: pkt.textColor,
                  padding: '2px 9px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: pkt.active ? `left ${pkt.dur}ms cubic-bezier(.4,0,.2,1)` : undefined,
                  opacity: pkt.active ? 1 : 0,
                }}
              >
                {pkt.label}
              </div>
            ))}
          </div>

          {/* Step bar */}
          <StepBar total={step.total} current={step.current} label={step.label} accentColor={COLOR} />

          {/* Simulation disclaimer */}
          <div className="mx-4 mt-3">
            <SimDisclaimer />
          </div>

          {/* Terminal (http modes) or Chat (WS mode) */}
          {mode === 'ws' ? (
            <div
              className="mx-4 my-3 rounded-lg border border-[var(--line)] overflow-hidden flex flex-col"
              style={{ height: 230 }}
            >
              {/* Chat header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--line)] flex-shrink-0"
                style={{ background: 'var(--bg2)' }}>
                <span className="text-[11px] font-semibold text-[var(--text)]"># general</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {[ALICE, BOB].map((u) => (
                    <div key={u.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: wsConnected ? u.color : 'var(--dim)' }} />
                      <span className="text-[9px] font-mono" style={{ color: wsConnected ? u.color : 'var(--muted)' }}>{u.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 ml-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: wsConnected ? COLOR : 'var(--dim)' }} />
                    <span className="text-[9px] font-mono" style={{ color: wsConnected ? COLOR : 'var(--muted)' }}>You</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="overflow-y-auto max-h-60 px-3 py-3 space-y-3" style={{ background: 'var(--bg)' }}>
                {chatMsgs.length === 0 && (
                  <p className="text-center text-[10px] font-mono text-[var(--muted)] pt-8">
                    Click an example below to open the WebSocket tunnel and join the chat.
                  </p>
                )}
                {chatMsgs.map((m) => {
                  if (m.side === 'system') {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <span className="text-[9px] font-mono px-3 py-1 rounded-full border"
                          style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}>
                          {m.text}
                        </span>
                      </div>
                    );
                  }
                  if (m.side === 'right') {
                    return (
                      <div key={m.id} className="flex flex-col items-end gap-0.5">
                        <div className="flex items-end gap-2">
                          <div className="flex flex-col items-end gap-1 max-w-[55%]">
                            <div className="px-3 py-2 rounded-2xl rounded-br-none text-[11px] font-mono leading-snug"
                              style={{
                                background: `color-mix(in srgb, ${COLOR} 22%, var(--bg2))`,
                                color: COLOR,
                                border: `1px solid color-mix(in srgb, ${COLOR} 30%, transparent)`,
                              }}>
                              {m.text}
                            </div>
                          </div>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mb-0.5"
                            style={{
                              background: `color-mix(in srgb, ${COLOR} 25%, var(--bg2))`,
                              color: COLOR,
                              border: `1px solid color-mix(in srgb, ${COLOR} 30%, transparent)`,
                            }}>
                            Y
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pr-9">
                          <span className="text-[9px] font-mono text-[var(--muted)]">{m.time}</span>
                          {m.delivered && (
                            <span className="text-[9px] font-mono" style={{ color: 'var(--c-api)' }}>
                              ✓✓ delivered to Alice &amp; Bob
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mb-0.5"
                        style={{
                          background: `color-mix(in srgb, ${m.avatarColor} 25%, var(--bg2))`,
                          color: m.avatarColor,
                          border: `1px solid color-mix(in srgb, ${m.avatarColor} 30%, transparent)`,
                        }}>
                        {m.avatar}
                      </div>
                      <div className="flex flex-col gap-0.5 max-w-[55%]">
                        <span className="text-[9px] font-mono" style={{ color: m.avatarColor }}>{m.from} · {m.time}</span>
                        <div className="px-3 py-2 rounded-2xl rounded-bl-none text-[11px] font-mono leading-snug"
                          style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--line)' }}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {typingUser && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${typingUser === 'Alice' ? ALICE.color : BOB.color} 25%, var(--bg2))`,
                        color: typingUser === 'Alice' ? ALICE.color : BOB.color,
                        border: `1px solid color-mix(in srgb, ${typingUser === 'Alice' ? ALICE.color : BOB.color} 30%, transparent)`,
                      }}>
                      {typingUser[0]}
                    </div>
                    <div className="px-4 py-2 rounded-2xl rounded-bl-none flex items-center gap-1"
                      style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--muted)', animation: `bounce 1s ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-[var(--muted)] mb-1">{typingUser} is typing…</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : lines.length === 0 && !busy ? (
            <div className="mx-4 my-3">
              {beginnerMode ? (
                <PlaygroundHint
                  action={mode === 'short'
                    ? "Click 'Price update every 2s' below to start a short-poll simulation"
                    : "Click any chip below to see a long-poll request hold open until data arrives"}
                  expect={mode === 'short'
                    ? "Count how many HTTP requests fire before one actually has data — that overhead is why WebSockets exist"
                    : "See the server hold the connection open instead of sending an empty response — fewer wasted requests than short poll"}
                  accentColor={COLOR}
                />
              ) : (
                <div className="h-36 rounded-lg border border-[var(--line)] flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl opacity-30">⌨</span>
                  <span className="text-xs text-[var(--muted)]">Pick an example below to start the simulation</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative mx-4 my-3">
              <Terminal lines={lines} className="max-h-52 border-[var(--line)]" />
              <button
                type="button"
                onClick={() => setLogsExpanded(true)}
                title="Expand logs"
                className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono transition-colors"
                style={{
                  background: `color-mix(in srgb, ${COLOR} 12%, var(--bg1))`,
                  color: COLOR,
                  border: `1px solid color-mix(in srgb, ${COLOR} 25%, var(--line))`,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 4V1h3M9 4V1H6M1 6v3h3M9 6v3H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                expand
              </button>
            </div>
          )}

          {/* Expanded log overlay */}
          {logsExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              onClick={() => setLogsExpanded(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
                style={{ background: 'var(--bg)', borderColor: COLOR + '44' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-2 text-xs font-mono text-[var(--muted)]">simulation log</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-1"
                      style={{ background: `color-mix(in srgb, ${COLOR} 15%, transparent)`, color: COLOR }}>
                      {lines.length} lines
                    </span>
                  </div>
                  <button type="button" onClick={() => setLogsExpanded(false)}
                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-lg leading-none px-1">
                    ×
                  </button>
                </div>
                <div className="overflow-y-auto p-5 space-y-1.5 flex-1">
                  {lines.map((line) => (
                    <div key={line.id} className="flex items-start gap-3">
                      <span className="text-[11px] font-mono text-[var(--dim)] flex-shrink-0 mt-px w-14 text-right">{line.timestamp}</span>
                      <span className="text-[11px] font-mono px-2 py-px rounded font-semibold flex-shrink-0 mt-px"
                        style={{ color: line.tagColor, background: `color-mix(in srgb, ${line.tagColor} 12%, transparent)`, minWidth: 36, textAlign: 'center' as const }}>
                        {line.tag}
                      </span>
                      <span className="text-[13px] text-[var(--text2)] leading-relaxed flex-1 break-words">{line.message}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-2.5 border-t flex-shrink-0 text-center"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg1)' }}>
                  <span className="text-[10px] text-[var(--muted)] font-mono">click outside or × to close</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What happened? — beginner mode summary */}
        <WhatHappenedPanel
          lines={lines}
          accentColor={COLOR}
          visible={!busy && lines.length > 0 && beginnerMode}
        />

        {/* Example chips */}
        <div className="flex-shrink-0">
          <p className="text-[10px] font-mono text-[var(--muted)] mb-2 px-0.5">
            {busy
              ? (mode === 'ws' ? 'Watch the chat above ↑' : 'Watch the simulation above ↑')
              : (mode === 'ws' ? 'Send a message to the group:' : `Try one of these ${mode === 'short' ? 'Short Poll' : 'Long Poll'} examples:`)}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {examples.map((ex) => (
              <button
                key={ex.cmd}
                type="button"
                disabled={busy}
                onClick={() => handleSend(ex.cmd)}
                className="group relative rounded-xl border text-left px-3 py-2.5 transition-all flex flex-col gap-1"
                style={{
                  background: busy ? 'var(--bg1)' : `color-mix(in srgb, ${COLOR} 4%, var(--bg1))`,
                  borderColor: busy ? 'var(--line)' : `color-mix(in srgb, ${COLOR} 20%, var(--line))`,
                  opacity: busy ? 0.45 : 1,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {!busy && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `color-mix(in srgb, ${COLOR} 6%, transparent)` }} />
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{ex.icon}</span>
                  <span className="text-[10px] font-semibold text-[var(--text)] leading-tight">{ex.label}</span>
                </div>
                <code className="text-[9px] font-mono leading-tight truncate block"
                  style={{ color: busy ? 'var(--muted)' : COLOR }}>
                  {ex.cmd}
                </code>
                <span className="text-[9px] text-[var(--muted)] leading-tight">{ex.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10">
      <InputBar
        modes={[
          { id: 'short', label: 'Short Poll' },
          { id: 'long',  label: 'Long Poll'  },
          { id: 'ws',    label: 'WebSocket'  },
        ]}
        activeMode={mode}
        onModeChange={resetState}
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        placeholder={
          mode === 'ws'
            ? 'Or type anything to send to Alice & Bob…'
            : 'Or describe what to poll for…'
        }
        disabled={busy}
        accentColor={COLOR}
      />
      </div>
    </div>
  );
}
