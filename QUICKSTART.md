# NDN IPFS Chain - Quick Start Guide

Get the NDN IPFS Chain environment running locally in 5 minutes.

## Prerequisites

- Docker Desktop (with Docker Compose)
- Node.js 20+
- Git
- ~20 GB free disk space

## Step 1: Clone Repository

```bash
git clone https://github.com/ndnanalytics/ndn-ipfs-chain.git
cd ndn-ipfs-chain
```

## Step 2: Start Docker Compose Stack

```bash
cd dev
docker-compose up -d
```

**Expected output:**
```
Creating dev_postgres_1   ... done
Creating dev_redis_1     ... done
Creating dev_kubo_1      ... done
Creating dev_cluster_1   ... done
Creating dev_api_1       ... done
```

## Step 3: Verify Services (Wait 30 seconds first)

```bash
# Check all services are running
docker-compose ps

# Test API health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok"}
```

## Step 4: Test Core Functionality

```bash
# List pins (empty initially)
curl -H "X-API-Key: test-key" http://localhost:3000/v1/pins

# Create a test pin
curl -X POST http://localhost:3000/v1/pins \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "cid": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "test-pin",
    "replication": 3
  }'

# Get usage analytics
curl -H "X-API-Key: test-key" http://localhost:3000/v1/analytics/usage
```

## Step 5: Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | API Key: `test-key` |
| **PostgreSQL** | localhost:5432 | User: `ndn`, Pass: `ndn`, DB: `ndnipfs` |
| **Redis** | localhost:6379 | No auth |
| **Kubo IPFS** | http://localhost:5001 | API endpoint |
| **IPFS Cluster** | http://localhost:9094 | API endpoint |

## Step 6: Run Integration Tests

```bash
cd ../tests
npm install
npm test
```

## Step 7: Build MCP Server (Optional)

```bash
cd ../mcp
npm install
npm run build

# Configure Claude Desktop with ~/.config/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "ndn-ipfs": {
      "command": "node",
      "args": ["/full/path/to/ndn-ipfs-chain/mcp/dist/index.js"],
      "env": {
        "NDN_API_URL": "http://localhost:3000/v1",
        "NDN_API_KEY": "test-key"
      }
    }
  }
}
```

## Verify Installation

```bash
# All these should return 200 status codes:

# 1. API Health
curl http://localhost:3000/health

# 2. List Pins
curl -H "X-API-Key: test-key" http://localhost:3000/v1/pins

# 3. IPFS Node Info
curl http://localhost:5001/api/v0/id

# 4. Cluster Peers
curl http://localhost:9094/api/v1/peers

# 5. Database
psql -h localhost -U ndn -d ndnipfs -c "SELECT version();"
```

## Common Issues

### Docker services won't start
```bash
# Free up disk space and restart Docker
docker system prune -a
docker-compose down -v
docker-compose up -d
```

### API server connection error
```bash
# Check API logs
docker-compose logs -f api

# Verify database is running
docker-compose logs -f postgres
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Change port in docker-compose.yaml if needed
```

## Next Steps

1. **Explore the Dashboard:** (Run `npm run dev` in the `dashboard/` directory)
2. **Test the Go CLI:** See `sdks/go/README.md`
3. **Review API Documentation:** See `api/server/README.md`
4. **Deploy to Production:** See `DEPLOYMENT.md`
5. **Verify Pre-Launch Checklist:** See `PRELAUNCH_CHECKLIST.md`

## Stopping the Stack

```bash
# Stop all services (keep volumes)
docker-compose stop

# Stop and remove everything (including volumes)
docker-compose down -v
```

## Architecture

```
┌─────────────────┐
│   Client Apps   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Server     │ :3000
│  (Fastify)      │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼
┌─────────┐┌─────────┐┌──────────┐┌──────────┐
│ PostGres│ │ Redis   │ │ Kubo    │ │ Cluster │
│  5432   │ │  6379   │ │  5001   │ │  9094   │
└─────────┘└─────────┘└──────────┘└──────────┘
```

## API Key Setup

The default test key is `test-key`. For production:

```bash
# Generate a secure API key
openssl rand -base64 32

# Use it in requests
curl -H "X-API-Key: your-key-here" http://localhost:3000/v1/pins
```

## Database Access

```bash
# Connect to PostgreSQL directly
psql -h localhost -U ndn -d ndnipfs

# List tables
\dt

# Check current schemas
\dn

# Exit
\q
```

## Performance Targets (Local Development)

| Metric | Target | Typical |
|--------|--------|---------|
| API response time | <100ms | 10-50ms |
| List pins (100) | <500ms | 50-150ms |
| Create pin | <2s | 500-1000ms |
| Database query | <10ms | 1-5ms |

## Environment Variables

For development, the defaults work fine:
- `NODE_ENV=development`
- `PORT=3000`
- `JWT_SECRET=dev-secret-change-me`
- `DATABASE_URL=postgres://ndn:ndn@postgres:5432/ndnipfs`

For production, see `.env.production.example`

## Support

- **Docs:** See `README.md` and individual service READMEs
- **Issues:** GitHub issues at https://github.com/ndnanalytics/ndn-ipfs-chain/issues
- **Email:** support@ndnanalytics.com

---

**You're all set!** 🚀 The NDN IPFS Chain is now running locally.
