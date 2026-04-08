# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspaces
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all workspace dependencies (hoists server + client deps)
RUN npm ci

# Copy server source
COPY server/ ./server/
COPY tsconfig.base.json ./

# Generate Prisma client
WORKDIR /app/server
RUN npx prisma generate

# Build
RUN npx nest build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy root package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

# Create uploads directory
RUN mkdir -p /app/data/uploads

EXPOSE 3000

CMD ["node", "server/dist/main"]
