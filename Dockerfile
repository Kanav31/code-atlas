# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first — maximises layer cache
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all deps (including devDeps needed for build)
# --no-frozen-lockfile allows pnpm to resolve platform-specific native binaries
# (lockfile was generated on macOS; Render builds on Linux)
RUN pnpm install --no-frozen-lockfile

# Copy all source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma client, then compile NestJS
RUN pnpm --filter @code-atlas/api exec prisma generate
RUN pnpm --filter @code-atlas/api build

# ─── Stage 2: Run ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy the pnpm virtual store + per-package node_modules symlinks from builder.
# Both must live at the same absolute paths so symlinks resolve correctly.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Compiled NestJS output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# package.json (needed by Node module resolution) + prisma schema
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
