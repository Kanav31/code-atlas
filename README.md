# Code Atlas

An interactive backend/systems education platform that teaches APIs, WebSockets, Kafka, Databases, Scalability, and Caching through animated visualizers, step-by-step guided tours, and curated interview Q&A.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma ORM, PostgreSQL |
| Auth | Passport.js — Google OAuth, GitHub OAuth, Local + JWT (access 15min / refresh 7d) |
| Email | Nodemailer |
| Database | Supabase (PostgreSQL) |
| Monorepo | pnpm workspaces |

---

## Monorepo Structure

```
code-atlas/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared TypeScript types
├── scripts/          # AI agent automation (security audit, code review, client feedback)
├── Dockerfile        # Multi-stage production build (API)
├── render.yaml       # Render deployment config
└── docker-compose.yml  # Local dev infra (MailHog)
```

---

## Features

- **6 visualizer pages** — API (REST vs gRPC), WebSockets, Kafka, Databases, Scalability, Caching
- **4-tab layout per page** — Understand · Playground · Deep Dive · Interview
- **Beginner Mode** — vocabulary primers, guided step-by-step tours, "What happened?" panels, key terms accordion
- **Auth** — Google OAuth, GitHub OAuth, email/password with reset flow
- **Newsletter** — subscribe/unsubscribe with admin blast endpoint

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Docker (for MailHog)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env templates and fill in values
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 3. Start local infra (MailHog for email dev)
docker compose up -d

# 4. Run database migrations (requires DATABASE_URL + DIRECT_URL in apps/api/.env)
pnpm db:migrate

# 5. Start all apps
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- MailHog UI: http://localhost:8025

---

## Production Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel (free tier) |
| Backend | Render (free tier, Docker) |
| Database | Supabase (free tier) |

### Environment variables

See `apps/api/.env.example` and `apps/web/.env.local.example` for all required variables.

### Deploy

1. **Supabase** — Create a project, copy the Transaction pooler URL (port 6543) as `DATABASE_URL` and Direct connection URL (port 5432) as `DIRECT_URL`
2. **Render** — Connect this repo, Render auto-detects `render.yaml` → set env vars in dashboard
3. **Vercel** — Connect this repo, set root directory to `apps/web` → set `NEXT_PUBLIC_API_URL`

---

## Scripts

```bash
pnpm dev                    # Start all apps in parallel
pnpm build                  # Build all packages + apps
pnpm db:migrate             # Run Prisma migrations
pnpm db:studio              # Open Prisma Studio
pnpm --filter web dev       # Frontend only
pnpm --filter api dev       # Backend only
```

---

## License

MIT
