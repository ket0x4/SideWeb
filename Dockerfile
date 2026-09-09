# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Build Frontend Assets & Server Bundle
# ==========================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy application sources and build static assets & server bundle
COPY . .
RUN bun run build
RUN bun build --target=bun server.ts --outfile=dist/server.js

# ==========================================
# Stage 2: Distroless Bun Production Runtime
# ==========================================
FROM oven/bun:1-distroless AS runner

WORKDIR /app

# Copy compiled static assets, bundled server, and 7zip-bin binaries from builder
COPY --from=builder --chown=65532:65532 /app/dist ./dist
COPY --from=builder --chown=65532:65532 /app/node_modules/7zip-bin ./node_modules/7zip-bin

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000

# Run as non-root user (UID 65532)
USER 65532:65532

CMD ["run", "dist/server.js"]
