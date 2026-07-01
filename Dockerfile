# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:22-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package manager files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# =============================================================================
# Stage 2: Production
# =============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations for runtime
COPY --from=builder /app/drizzle ./drizzle

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/trpc/system.health?input=%7B%22timestamp%22%3A%220%22%7D || exit 1

# Run the application
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]