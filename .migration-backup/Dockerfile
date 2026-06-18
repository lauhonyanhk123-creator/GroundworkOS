FROM node:20-alpine AS base

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json package-lock.json* ./
COPY groundworkos/package.json ./groundworkos/
COPY groundworkos-mcp/package.json ./groundworkos-mcp/

RUN npm ci

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

WORKDIR /app/groundworkos
RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────────
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# standalone output mirrors the monorepo root because outputFileTracingRoot
# is set to the workspace root in next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/groundworkos/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/groundworkos/.next/static ./groundworkos/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/groundworkos/public ./groundworkos/public

USER nextjs
WORKDIR /app/groundworkos

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
