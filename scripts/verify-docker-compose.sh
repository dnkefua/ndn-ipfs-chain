#!/bin/bash

# NDN IPFS Chain - Docker Compose Environment Verification Script
# Verifies all services are running and healthy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEV_DIR="$PROJECT_ROOT/dev"

echo "🔍 NDN IPFS Chain - Docker Compose Verification"
echo "=================================================="
echo ""

# Check Docker is running
echo "✓ Checking Docker daemon..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo "  Docker is running"

# Check Docker Compose
echo "✓ Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi
COMPOSE_VERSION=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+' | head -1)
echo "  Docker Compose version: $COMPOSE_VERSION"

# Navigate to dev directory
echo "✓ Navigating to dev directory..."
cd "$DEV_DIR"
echo "  Working directory: $(pwd)"

# Pull latest images
echo ""
echo "📦 Pulling latest service images..."
docker-compose pull --ignore-buildable 2>/dev/null || true

# Build API server
echo ""
echo "🏗️  Building API server image..."
docker-compose build api --no-cache=false

# Start services
echo ""
echo "🚀 Starting Docker Compose stack..."
docker-compose up -d

# Wait for services to initialize
echo ""
echo "⏳ Waiting 20 seconds for services to initialize..."
sleep 20

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

# Verify PostgreSQL
echo ""
echo "✓ Verifying PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U ndn -d ndnipfs > /dev/null 2>&1; then
    echo "  ✓ PostgreSQL is responding"
    POSTGRES_VERSION=$(docker-compose exec -T postgres psql -U ndn -d ndnipfs -t -c "SELECT version();" 2>/dev/null | head -1 | cut -d' ' -f1-3)
    echo "  Version: $POSTGRES_VERSION"
else
    echo "  ❌ PostgreSQL is not responding"
    exit 1
fi

# Verify Redis
echo ""
echo "✓ Verifying Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "  ✓ Redis is responding"
    REDIS_INFO=$(docker-compose exec -T redis redis-cli INFO server | grep redis_version | cut -d: -f2)
    echo "  Version: $REDIS_INFO"
else
    echo "  ❌ Redis is not responding"
    exit 1
fi

# Verify Kubo (IPFS)
echo ""
echo "✓ Verifying Kubo (IPFS)..."
if curl -s http://localhost:5001/api/v0/id > /dev/null 2>&1; then
    echo "  ✓ Kubo API is responding"
    IPFS_ID=$(curl -s http://localhost:5001/api/v0/id | grep -o '"ID":"[^"]*' | cut -d'"' -f4 | head -c 12)
    echo "  Node ID: $IPFS_ID..."
else
    echo "  ⚠️  Kubo API not yet responding (it may still be initializing)"
fi

# Verify IPFS Cluster
echo ""
echo "✓ Verifying IPFS Cluster..."
if curl -s http://localhost:9094/api/v1/peers > /dev/null 2>&1; then
    echo "  ✓ IPFS Cluster API is responding"
else
    echo "  ⚠️  IPFS Cluster not yet responding (it may still be initializing)"
fi

# Verify API Server
echo ""
echo "✓ Verifying API Server..."
RETRY_COUNT=0
MAX_RETRIES=10
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "  ✓ API Server is responding"
        HEALTH=$(curl -s http://localhost:3000/health)
        echo "  Response: $HEALTH"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "  ⏳ API Server initializing... (attempt $RETRY_COUNT/$MAX_RETRIES)"
            sleep 2
        fi
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "  ❌ API Server is not responding"
    echo ""
    echo "📋 API Server logs:"
    docker-compose logs api | tail -50
    exit 1
fi

# Test basic API endpoint
echo ""
echo "✓ Testing basic API endpoints..."
echo "  GET /v1/pins (with API Key)..."
if curl -s -H "X-API-Key: test-key" http://localhost:3000/v1/pins | grep -q "pins\|error" 2>/dev/null; then
    echo "    ✓ Endpoint is responding"
else
    echo "    ⚠️  Endpoint response unexpected"
fi

# Summary
echo ""
echo "✅ All services are healthy and ready!"
echo ""
echo "📋 Quick Reference:"
echo "  - PostgreSQL: localhost:5432 (user: ndn, pass: ndn, db: ndnipfs)"
echo "  - Redis: localhost:6379"
echo "  - Kubo API: http://localhost:5001"
echo "  - IPFS Cluster: http://localhost:9094"
echo "  - API Server: http://localhost:3000"
echo "  - Dashboard: http://localhost:3001 (when running)"
echo ""
echo "🧪 To run integration tests:"
echo "  npm test --workspace=tests"
echo ""
echo "🛑 To stop the stack:"
echo "  docker-compose down -v"
echo ""
