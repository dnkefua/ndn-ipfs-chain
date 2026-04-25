FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy source code
COPY src ./src
COPY openapi.yaml ./openapi.yaml

# Health check script
RUN echo '#!/bin/sh' > /healthcheck.sh && \
    echo 'curl -f http://localhost:3000/_health || exit 1' >> /healthcheck.sh && \
    chmod +x /healthcheck.sh

# Production image
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts from build stage
COPY --from=build --chown=nodejs:nodejs /app /app
COPY --from=build --chown=nodejs:nodejs /healthcheck.sh /healthcheck.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# Start server
CMD ["node", "src/index.js"]
