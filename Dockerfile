# Multi-stage production build for DealFlow Network
# This Dockerfile creates an optimized production image

# Rust stage: Build ASIMOV tools (COMMENTED OUT - Enable in Phase 3)
# FROM rust:1.75-slim AS rust-builder
# WORKDIR /build
# Install ASIMOV brightdata-importer (assuming it's available via cargo or git)
# TODO: Update this with actual ASIMOV installation command when available
# RUN cargo install asimov-brightdata-importer || echo "ASIMOV installer pending"

# Base stage: Node 20 with pnpm (using debian for better Rust compatibility)
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app

# Install minimal Rust runtime dependencies (no full toolchain needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage: Install all dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Build stage: Build frontend and backend
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time arguments for Vite environment variables
# These are baked into the frontend bundle at build time
ARG VITE_APP_TITLE="DealFlow Network"
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_FRONTEND_FORGE_API_KEY

ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL
ENV VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY

# Build frontend (Vite) and backend (esbuild)
RUN pnpm run build

# Production stage: Minimal runtime image
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy ASIMOV binary from rust-builder (COMMENTED OUT - Enable in Phase 3)
# COPY --from=rust-builder /usr/local/cargo/bin/asimov-brightdata-importer /usr/local/bin/ || true

# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle

# Security: Run as non-root user
USER node

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
