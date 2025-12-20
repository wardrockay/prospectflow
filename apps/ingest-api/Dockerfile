# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/env ./env
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/app.js"]
