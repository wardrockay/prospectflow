# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy ui-web package
COPY apps/ui-web ./apps/ui-web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
WORKDIR /app/apps/ui-web
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/ui-web/.output ./.output
COPY --from=builder /app/apps/ui-web/package.json ./

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=4000

# Start the application
CMD ["node", ".output/server/index.mjs"]
