# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspaces
COPY package.json package-lock.json ./
COPY server/package.json ./server/
# Stub client package to satisfy workspace resolution without installing frontend deps
RUN mkdir -p ./client && echo '{"name":"@metrico/client","version":"1.0.0","private":true}' > ./client/package.json

# Install all dependencies
RUN npm ci --workspace=server

# Copy server source
COPY server/ ./server/
COPY tsconfig.base.json ./

# Build
WORKDIR /app/server
RUN npx nest build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy root package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN mkdir -p ./client && echo '{"name":"@metrico/client","version":"1.0.0","private":true}' > ./client/package.json

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

# Create uploads directory
RUN mkdir -p /app/data/uploads

EXPOSE 3000

CMD ["node", "server/dist/main"]
