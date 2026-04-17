# NDN IPFS Chain - Pre-Launch Checklist

**Status: Ready for MVP Launch Verification**

---

## Phase 1: Local Environment Setup ✓

### Prerequisites
- [ ] Docker Desktop installed and running
- [ ] Docker Compose version >= 2.0
- [ ] Node.js 20+ installed
- [ ] Git configured
- [ ] ~20 GB free disk space for Docker volumes

### Environment Variables
- [ ] Created `.env` in project root (if needed for secrets)
- [ ] Verified `dev/docker-compose.yaml` has all required services
- [ ] All database credentials match expected values

---

## Phase 2: Build & Dependency Verification ✓

### API Server
- [ ] Dockerfile exists at `api/server/Dockerfile`
- [ ] package.json exists at `api/server/package.json`
- [ ] Dependencies compilable (Node ESM + Fastify 4)
- [ ] TypeScript compilation successful

### Dashboard
- [ ] Next.js configuration verified
- [ ] Tailwind CSS build verified
- [ ] TypeScript strict mode enabled
- [ ] All dependencies installed

### SDKs
- [ ] Go SDK: `sdks/go/go.mod` valid
- [ ] Go CLI: `sdks/go/cmd/ndn/main.go` compiles
- [ ] JS SDK: `sdks/js/build.test.ts` passes
- [ ] Python SDK: Import structure verified

### MCP Server
- [ ] `mcp/package.json` has @modelcontextprotocol/sdk dependency
- [ ] `mcp/tsconfig.json` configured for ES2020
- [ ] `mcp/src/index.ts` complete with all 7 tools
- [ ] Ready to build: `cd mcp && npm install && npm run build`

---

## Phase 3: Docker Compose Stack Verification

### Service Status Check
```bash
# From project root:
cd dev
docker-compose up -d

# Wait 30 seconds for services to initialize
docker-compose ps

# Expected output:
# NAME        STATUS              PORTS
# postgres    Up (healthy)        5432/tcp
# redis       Up (healthy)        6379/tcp
# kubo        Up (healthy)        5001/tcp, 8080/tcp
# cluster     Up (healthy)        9094/tcp, 9096/tcp
# api         Up (healthy)        3000/tcp
```

### Health Checks
- [ ] PostgreSQL listening on port 5432
  ```bash
  psql -h localhost -U ndn -d ndnipfs -c "SELECT version();"
  ```

- [ ] Redis listening on port 6379
  ```bash
  redis-cli ping  # Should respond "PONG"
  ```

- [ ] Kubo API on port 5001
  ```bash
  curl http://localhost:5001/api/v0/id
  ```

- [ ] IPFS Cluster on port 9094
  ```bash
  curl http://localhost:9094/api/v1/peers
  ```

- [ ] API Server on port 3000
  ```bash
  curl http://localhost:3000/health
  # Should return: { "status": "ok" }
  ```

---

## Phase 4: Integration & End-to-End Tests

### API Tests
- [ ] Run full integration test suite:
  ```bash
  npm test --workspace=tests
  ```
  Expected: All 40+ test cases pass

- [ ] Manual smoke tests:
  ```bash
  # Create test pin
  curl -X POST http://localhost:3000/v1/pins \
    -H "X-API-Key: test-key" \
    -H "Content-Type: application/json" \
    -d '{"cid":"QmXxxx","name":"test"}'

  # List pins
  curl http://localhost:3000/v1/pins \
    -H "X-API-Key: test-key"
  ```

### Dashboard Tests
- [ ] Navigate to http://localhost:3001
- [ ] Sign up / SIWE login flow works
- [ ] Dashboard loads without errors
- [ ] API Key management page responsive
- [ ] Analytics graphs render

### CLI Tool Tests
- [ ] Go CLI builds:
  ```bash
  cd sdks/go && go build ./cmd/ndn
  ./ndn pin cid QmXxxx --name "test"
  ```

---

## Phase 5: MCP Server Setup

### Build MCP Server
```bash
cd mcp
npm install
npm run build
```

- [ ] `mcp/dist/index.js` generated
- [ ] No TypeScript errors
- [ ] File is executable

### Test MCP Server Locally (Optional)
```bash
# Terminal 1: Run MCP server
cd mcp
npm start

# Should output: "MCP stdio server listening..."

# Terminal 2: Configure Claude Desktop
# Edit ~/.config/Claude/claude_desktop_config.json (or create):
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

- [ ] MCP server connects to Claude Desktop
- [ ] Tools visible in conversation
- [ ] Sample prompt works: "Show me my largest pins"

---

## Phase 6: Security & Configuration Verification

### Environment Secrets
- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] API keys are rotated (not default values)
- [ ] Database password is secure
- [ ] No credentials in git history

### HTTPS/TLS
- [ ] Production domain registered (ndnipfs.link)
- [ ] SSL certificates obtained (Let's Encrypt via cert-manager)
- [ ] CORS configured for allowed origins
- [ ] Rate limiting configured

### Database
- [ ] PostgreSQL backups automated
- [ ] Database schema migrations applied
- [ ] Indexes created on hot columns (cid, user_id, created_at)
- [ ] Vacuum/analyze scheduled

### IPFS Network
- [ ] Kubo peer count > 0
- [ ] Cluster CRDT state synced
- [ ] Gateway working for retrieval
- [ ] Pin status tracking operational

---

## Phase 7: Monitoring & Observability

### Logs
- [ ] API server logs accessible
  ```bash
  docker-compose logs -f api
  ```
- [ ] Database logs accessible
  ```bash
  docker-compose logs -f postgres
  ```

### Metrics
- [ ] Prometheus scrape configuration ready (for production)
- [ ] Grafana dashboard templates prepared
- [ ] Alert rules defined

### Tracing
- [ ] Jaeger deployment ready (optional for MVP)
- [ ] Request tracing enabled in API

---

## Phase 8: Production Readiness

### Deployment Strategy
- [ ] Choose deployment target: AWS ECS Fargate / Kubernetes / Docker Swarm
- [ ] IAM roles configured (if AWS)
- [ ] Kubernetes namespace created (if K8s)
- [ ] ECR repositories set up (if ECS/K8s)

### CI/CD Pipeline
- [ ] GitHub Actions workflow validated
- [ ] `.github/workflows/deploy.yaml` tested on feature branch
- [ ] Build step passes
- [ ] Push to ECR succeeds
- [ ] Deployment manifests ready

### DNS & Load Balancing
- [ ] Domain registrar updated with nameservers
- [ ] Load balancer configured (ALB for ECS, Ingress for K8s)
- [ ] Healthcheck endpoints configured
- [ ] SSL termination enabled

### Backup & Disaster Recovery
- [ ] Database backup script tested
- [ ] Recovery procedure documented
- [ ] Offsite backup configured
- [ ] RTO/RPO targets defined (4h / 30m)

---

## Phase 9: Launch Day Tasks

### Pre-Launch (Day 1 Morning)
- [ ] Final smoke test of all services
- [ ] Verify error handling and logging
- [ ] Check monitoring dashboards
- [ ] Team on-call schedule published
- [ ] Incident response runbook reviewed

### Launch (Day 1 Afternoon)
- [ ] DNS updated to point to production
- [ ] SSL certificates deployed
- [ ] First batch of beta users onboarded
- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor uptime (target: 99.9%)

### Post-Launch (Day 2-3)
- [ ] User feedback collection
- [ ] Performance analysis
- [ ] Database growth monitoring
- [ ] Scale up infrastructure if needed
- [ ] Blog post + social media announcement
- [ ] Email beta users with product link

---

## Phase 10: Success Criteria (MVP)

| Metric | Target | Status |
|--------|--------|--------|
| Uptime | 99.9% | Monitoring enabled |
| API latency (p95) | <100ms | Prometheus ready |
| Error rate | <0.1% | Alert rules configured |
| User onboarding time | <5 min | Dashboard tested |
| Pin creation latency | <2s | Benchmarked |
| Database queries (p95) | <10ms | Index optimization done |
| IPFS gateway TTFB | <200ms | Gateway deployed |

---

## Rollback Plan

If critical production issues occur:

```bash
# Kubernetes
kubectl rollout undo deployment/api -n ndn-prod
kubectl rollout history deployment/api -n ndn-prod

# AWS ECS
aws ecs update-service --cluster ndn-prod --service api --force-new-deployment

# Steps
1. Alert team on-call immediately
2. Initiate rollback to last stable version
3. Investigate logs & metrics
4. Fix in development
5. Test in staging
6. Re-deploy to production
```

---

## Quick Start Commands

```bash
# 1. Build and start local environment
cd dev
docker-compose up -d

# 2. Wait for services to be ready (30s)
sleep 30

# 3. Verify all services healthy
docker-compose ps

# 4. Run integration tests
npm test --workspace=tests

# 5. Build MCP server
cd ../mcp
npm install
npm run build

# 6. Check API health
curl http://localhost:3000/health

# 7. List initial pins (empty)
curl http://localhost:3000/v1/pins \
  -H "X-API-Key: test-key"

# 8. Stop everything (when done)
cd ../dev
docker-compose down -v
```

---

## Support & Escalation

- **Technical Issues**: Check DEPLOYMENT.md for detailed troubleshooting
- **Database Questions**: Consult API server README
- **IPFS/Cluster Questions**: Check gateway/ and workers/ documentation
- **MCP Issues**: See mcp/README.md troubleshooting section
- **Security Concerns**: Contact security@ndnanalytics.com

---

**Last Updated:** 2026-04-17  
**Next Phase:** Execute Phase 3 (Docker Compose Stack Verification) and Phase 4 (Integration Tests)
