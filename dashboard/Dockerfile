# syntax=docker/dockerfile:1.6
# Multi-stage build for Next.js 14 App Router in `standalone` output mode.
# Stage 1: install deps with full toolchain
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: build the Next.js app
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are baked at build time. Default points at the deployed Cloud Run API;
# override with `--build-arg NEXT_PUBLIC_API_URL=...` if you need to retarget per environment.
ARG NEXT_PUBLIC_API_URL=https://ndn-api-1037328355027.us-west1.run.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Stage 3: minimal runtime — only the standalone server + static assets
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install curl for health checks
RUN apk add --no-cache curl

# Non-root user (node uid is 1000 on node:alpine)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Copy the standalone bundle (contains server.js + required node_modules) and static assets
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Health check script
RUN echo '#!/bin/sh' > /healthcheck.sh && \
    echo 'curl -f http://localhost:3000 || exit 1' >> /healthcheck.sh && \
    chmod +x /healthcheck.sh && \
    chown nextjs:nodejs /healthcheck.sh

USER nextjs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD /healthcheck.sh

CMD ["node", "server.js"]
