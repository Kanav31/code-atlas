# Code Atlas — Claude Guidelines

## Project
Interactive backend/systems education platform (APIs, WebSockets, Kafka, DBs, Scalability, Caching) with animated visualizers and Q&A. **pnpm monorepo**: Next.js 14 frontend + NestJS backend. Code is reviewed by an AI agent — write production-quality, reviewable code.

## Monorepo Structure
```
code-atlas/
├── apps/
│   ├── web/          # Next.js 14 App Router
│   └── api/          # NestJS
├── packages/
│   └── shared/       # Shared TS types & utils (@code-atlas/shared)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Tech Stack
| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui |
| Backend  | NestJS, TypeScript strict, Prisma ORM, PostgreSQL |
| Auth     | Passport.js (Google OAuth2, GitHub OAuth, Local), JWT |
| Email    | Nodemailer |
| Fonts    | Inter 700/800 (headings), DM_Sans (body) — `next/font/google` |
| Monorepo | pnpm workspaces |

## Hard Rules
- **No** Pages Router — App Router only
- **No** `any` — strict TypeScript everywhere
- **No** raw SQL — Prisma client only
- **No** edits to `src/components/ui/` (shadcn CLI managed)
- **No** italic font styles
- **No** `.env` commits
- **No** `next.config.ts` — use `next.config.mjs`
- **No** `Geist` font — use `DM_Sans`

## Frontend Conventions (`apps/web`)
**Route groups:** `(auth)` · `(dashboard)`

**Component tree:**
```
src/components/
├── layout/          # Sidebar, PageHeader, TabBar
├── auth/            # LoginForm, SignupForm, OAuthButtons, ForgotPasswordForm
├── visualizer/
│   ├── shared/      # ELI5Card, Callout, CodeBlock, Playground, Terminal,
│   │                  Stage, InputBar, ResponsePanel, ComparisonGrid,
│   │                  Tag, StepBar, ScoreToast
│   └── pages/       # ApiPage, RealtimePage, KafkaPage, DbPage, ScalePage, CachePage
└── ui/              # shadcn primitives (do not edit)
```

**Utilities** (`src/lib/utils.ts`): `sleep(ms)`, `rand(a,b)`, `pick(arr)`, `ts()`  
**Auth:** `src/lib/auth-context.tsx` | **API client:** `src/lib/api.ts`

## Design System
- Dark theme only — CSS variables in `globals.css`
- Weight-only hierarchy (no italics): Inter 700/800 titles, DM_Sans body
- Page accent vars: `--c-api` emerald · `--c-rt` amber · `--c-kafka` fuchsia · `--c-db` blue · `--c-scale` red · `--c-cache` violet
- shadcn/ui dark variant

## Backend Conventions (`apps/api`)
**Modules:** `auth` · `users` · `newsletter` · `mail`  
**JWT:** access 15 min · refresh 7 days  
**Guards:** `JwtAuthGuard` · `GoogleOAuthGuard` · `GithubOAuthGuard`  
**Prisma models:** `User` · `NewsletterSubscriber` · `PasswordReset`

## Visualizer — Shared Game Mechanics

Every visualizer **play tab** shares the same state/animation pattern.

### Shared Components
| Component | Props |
|-----------|-------|
| `StepBar` | `total`, `current`, `label`, `accentColor` |
| `ScoreToast` | `message`, `accentColor` — null-reset trick to retrigger: `setMsg(null); setTimeout(() => setMsg(x), 10)` |

### Standard State Shape
```ts
const [packets,  setPackets]  = useState<Packet[]>([]);
const [glows,    setGlows]    = useState<Set<string>>(new Set());
const [step,     setStep]     = useState({ total: N, current: -1, label: '...' });
const [scoreMsg, setScoreMsg] = useState<string | null>(null);
```

### `flyPkt` — Packet Animation (CSS transition)
```ts
async function flyPkt(fromXPct, toXPct, yPct, label, color, textColor, dur = 550) {
  const id = `p${Date.now()}${Math.random()}`;
  setPackets(prev => [...prev, { id, fromXPct, toXPct, yPct, label, color, textColor, active: false }]);
  await sleep(32);                    // allow initial render at fromXPct
  setPackets(prev => prev.map(p => p.id === id ? { ...p, active: true } : p));
  await sleep(dur + 80);              // wait for cubic-bezier(.4,0,.2,1) transition
  setPackets(prev => prev.filter(p => p.id !== id));
}
```

### `pulseGlow` — Node Highlight
```ts
function pulseGlow(id: string) {
  setGlows(s => new Set([...s, id]));
  setTimeout(() => setGlows(s => { const n = new Set(s); n.delete(id); return n; }), 1200);
}
```

### Layout Conventions
- Node strips: `relative` container, 120–130 px height, absolutely-positioned cards
- Background: `linear-gradient` grid at 40 px intervals, opacity 0.3
- Connections: SVG dashed lines
- Glow: `boxShadow` when node id ∈ `glows`
- Fan-out: `await Promise.all([flyPkt(...), flyPkt(...)])`

### RealtimePage Specifics
- Nodes at X%: You 12% · Server 50% · Alice 73% · Bob 88% (Alice/Bob angled Y)
- On connect: auto-play Alice/Bob intro + typing indicator
- `pickBotReply(msg)` — keyword-based replies
- Sent bubbles show `✓✓ delivered to Alice & Bob`
- Non-WS modes → `Terminal`; WS mode → group chat UI

## Dev Commands
```bash
pnpm install
pnpm dev                                      # all apps
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter api exec prisma migrate dev
```

## Environment Variables
**`apps/web/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GITHUB_CLIENT_ID=
```
**`apps/api/.env`**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/codeatlas
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=   GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=   GITHUB_CLIENT_SECRET=
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=          MAIL_PASS=
MAIL_FROM="Code Atlas <noreply@codeatlas.dev>"
FRONTEND_URL=http://localhost:3000
```
