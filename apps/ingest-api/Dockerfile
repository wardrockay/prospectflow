# syntax=docker/dockerfile:1

# Build stage - uses pnpm and handles monorepo workspace dependencies
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy root workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy packages that ingest-api depends on
COPY packages/auth-core ./packages/auth-core

# Copy the ingest-api application
COPY apps/ingest-api ./apps/ingest-api

# Install dependencies using pnpm with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build auth-core first (dependency)
RUN pnpm --filter @prospectflow/auth-core build

# Build ingest-api
RUN pnpm --filter prospectflow-ingest-api build

# Production stage - minimal image
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Install pnpm for production install
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy auth-core built package
COPY --from=builder /usr/src/app/packages/auth-core/package.json ./packages/auth-core/
COPY --from=builder /usr/src/app/packages/auth-core/dist ./packages/auth-core/dist

# Copy ingest-api built application
COPY --from=builder /usr/src/app/apps/ingest-api/package.json ./apps/ingest-api/
COPY --from=builder /usr/src/app/apps/ingest-api/dist ./apps/ingest-api/dist
# Copy data files (JSON assets not compiled by TypeScript)
COPY --from=builder /usr/src/app/apps/ingest-api/src/data ./apps/ingest-api/dist/data

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

WORKDIR /usr/src/app/apps/ingest-api

EXPOSE 3000

CMD ["node", "dist/server.js"]
