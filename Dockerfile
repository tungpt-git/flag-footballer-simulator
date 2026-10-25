# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install all dependencies (prisma CLI is a devDependency, needed for build + migrate).
# npm only bootstraps pnpm. Node 22.15's corepack cannot launch pnpm 12 (it looks for pnpm.cjs).
FROM base AS deps
RUN npm install -g pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# Build the Next.js standalone output.
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `pnpm run build` generates the Prisma client, then compiles. Placeholder URL lets
# route modules import during `next build`; no connection is made. The real
# DATABASE_URL is injected at runtime and is never baked into the image.
RUN --mount=type=cache,target=/app/.next/cache \
    DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm run build

# One-shot image that applies migrations: `prisma migrate deploy`.
FROM deps AS migrator
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# Minimal runtime image.
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
