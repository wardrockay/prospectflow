# syntax=docker/dockerfile:1

# Build stage - uses pnpm and handles monorepo workspace dependencies
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy root workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy packages that campaign-api depends on
COPY packages/auth-core ./packages/auth-core

# Copy the campaign-api application
COPY apps/campaign-api ./apps/campaign-api

# Install dependencies using pnpm with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build auth-core first (dependency)
RUN pnpm --filter @prospectflow/auth-core build

# Build campaign-api
RUN pnpm --filter prospectflow-campaign-api build

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

# Copy campaign-api built application
COPY --from=builder /usr/src/app/apps/campaign-api/package.json ./apps/campaign-api/
COPY --from=builder /usr/src/app/apps/campaign-api/dist ./apps/campaign-api/dist

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

WORKDIR /usr/src/app/apps/campaign-api

EXPOSE 3001

CMD ["node", "dist/server.js"]
