FROM node:20-alpine

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first — layer cache for installs
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --no-frozen-lockfile

# Copy source after install so code changes don't bust the dep cache
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @code-atlas/api exec prisma generate && \
    pnpm --filter @code-atlas/api build

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
