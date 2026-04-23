# Production Readiness Guide

**Last Updated:** 2026-04-23  
**Version:** 1.0

This guide covers everything needed to run NDN IPFS Chain in production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Security](#security)
8. [Incident Response](#incident-response)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Cloud Run (API) | 2 vCPU, 4 GiB | 4 vCPU, 8 GiB |
| Cloud SQL (PostgreSQL) | 2 vCPU, 8 GiB | 8 vCPU, 32 GiB HA |
| Memorystore (Redis) | 1 GiB | 5 GiB HA |
| IPFS Cluster | 3 nodes, 4 vCPU each | 5 nodes, 8 vCPU each |
| Cloud Storage | 100 GiB | 1 TiB+ |

### Required Services

- Google Cloud Platform project with billing enabled
- IPFS Cluster (self-managed or Pinata endpoint)
- PostgreSQL 16+ database
- Redis 6+ cache
- Container Registry access

### Required Tools

```bash
# Install gcloud
curl https://sdk.cloud.google.com | bash

# Install kubectl
gcloud components install kubectl

# Install Docker
# https://docs.docker.com/get-docker/

# Install Node.js 20+
nvm install 20
```

---

## Quick Start

### 1. Generate Secrets

```bash
node scripts/generate-secrets.js --output .env.production
chmod 600 .env.production
```

### 2. Configure Environment

Edit `.env.production` with your values:

```bash
# Required
DATABASE_URL=postgres://user:pass@host:5432/ndnipfs
REDIS_URL=redis://user:pass@host:6379/0
CLUSTER_AUTH=username:password
JWT_SECRET=<generated-secret>

# Optional but recommended
STRIPE_SECRET_KEY=sk_live_...
RPC_ETHEREUM=https://mainnet.infura.io/v3/...
```

### 3. Deploy

```bash
# Set environment
export GOOGLE_CLOUD_PROJECT=ndn-ipfs-chain
export ENVIRONMENT=production

# Run deployment script
./scripts/production-deploy.sh production
```

### 4. Verify

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe ndn-ipfs-api \
    --region us-west1 --format 'value(status.url)')

# Health check
curl $SERVICE_URL/_health

# Should return: {"status":"ok","service":"ndn-ipfs-api","version":"1.0.0"}
```

---

## Architecture Overview

```
                                    ┌─────────────────────────────────────┐
                                    │         Cloudflare CDN              │
                                    │      (DDoS protection, caching)     │
                                    └─────────────────┬───────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
        │   Cloud Run (API)     │         │   Cloud Run (API)     │         │   Cloud Run (API)     │
        │    us-west1           │         │    us-east1           │         │    eu-west1          │
        │                       │         │                       │         │                       │
        │  - REST API           │         │  - REST API           │         │  - REST API           │
        │  - Auth               │         │  - Auth               │         │  - Auth               │
        │  - Validation         │         │  - Validation         │         │  - Validation         │
        └───────────┬───────────┘         └───────────┬───────────┘         └───────────┬───────────┘
                    │                                 │                                 │
                    └─────────────────────────────────┼─────────────────────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
        │   Cloud SQL (Primary) │◄───────►│   Cloud SQL (Replica) │         │   Memorystore (Redis) │
        │   PostgreSQL 16       │         │   Read Replicas       │         │   Cache + Rate Limit  │
        └───────────┬───────────┘         └───────────────────────┘         └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   IPFS Cluster        │
        │   (3-5 nodes)         │
        │                       │
        │  - Pin coordination   │
        │  - CRDT sync          │
        │  - Geo-distribution   │
        └───────────────────────┘
```

### Services

| Service | Purpose | SLA Target |
|---------|---------|------------|
| API Server | REST endpoints, auth | 99.99% |
| Lifecycle Worker | Hot→cold transitions | 99.9% |
| Trigger Worker | Smart contract monitoring | 99.9% |
| Filecoin Broker | Deal orchestration | 99.5% |
| Crypto-Shred Anchor | Merkle root anchoring | 99.9% |

---

## Configuration

### Environment Variables

#### Core (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `CLUSTER_AUTH` | IPFS Cluster Basic auth | `user:pass` |
| `JWT_SECRET` | JWT signing secret (64+ chars) | `<generated>` |
| `NODE_ENV` | Environment | `production` |

#### Security

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY_HASH_SALT` | Salt for API key hashing | `<generated>` |
| `ENCRYPTION_KEY` | Envelope encryption key | `<generated>` |
| `ANCHOR_PRIVATE_KEY` | L2 anchoring wallet key | `0x...` |

#### Integrations

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe billing | `sk_live_...` |
| `RPC_ETHEREUM` | Ethereum RPC endpoint | `https://...` |
| `RPC_SOLANA` | Solana RPC endpoint | `https://...` |
| `BOOST_API_URL` | Filecoin Boost API | `https://...` |

### Rate Limiting

Default: 1000 requests/minute per tenant

```bash
# Adjust in .env.production
RATE_LIMIT_MAX=2000  # Higher for enterprise
```

### CORS Configuration

```bash
# Multiple origins (comma-separated)
CORS_ORIGIN=https://app.ndnipfs.com,https://dashboard.ndnipfs.com
CORS_CREDENTIALS=true
```

---

## Deployment

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build and deploy
        run: |
          ./scripts/production-deploy.sh production
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          # ... other secrets
```

### Blue-Green Deployment

```bash
# Deploy to green environment
./scripts/production-deploy.sh production --color green

# Verify
curl https://api-green.ndnipfs.com/_health

# Switch traffic
gcloud run services update-traffic ndn-ipfs-api \
    --to-latest=100 \
    --region us-west1
```

### Rollback

```bash
# Automatic rollback on failure (script handles this)

# Manual rollback
gcloud run services update-traffic ndn-ipfs-api \
    --to-revision=ndn-ipfs-api-abc123=100 \
    --region us-west1
```

---

## Monitoring

### Metrics to Watch

| Metric | Alert Threshold | Dashboard |
|--------|-----------------|-----------|
| API Latency (p99) | > 500ms | Grafana #1 |
| Error Rate | > 1% | Grafana #1 |
| Request Rate | Anomaly detection | Grafana #1 |
| DB Connections | > 80% capacity | Grafana #2 |
| Redis Memory | > 80% | Grafana #2 |
| IPFS Cluster Size | < 3 peers | Grafana #3 |
| Pin Success Rate | < 99% | Grafana #3 |

### Alerting

```bash
# Configure in monitoring/alerts/
# Alert destinations: PagerDuty, Slack, Email

# Example: High error rate
- name: High API Error Rate
  condition: error_rate > 0.01 for 5m
  severity: P1
  runbook: runbooks/high-error-rate.md
```

### Logging

Logs are structured JSON and sent to Cloud Logging:

```json
{
  "severity": "ERROR",
  "message": "Cluster pin failed",
  "service": "ndn-ipfs-api",
  "tenant": "tenant-123",
  "cid": "bafy...",
  "err": "connection refused"
}
```

Query examples:

```
# All errors in last hour
severity>=ERROR timestamp>"2026-04-23T00:00:00Z"

# Specific tenant
jsonPayload.tenant="tenant-123"

# Pin failures
jsonPayload.cid:* AND severity=ERROR
```

---

## Security

### Authentication

Three auth methods supported:

1. **API Key** (recommended for servers)
   ```bash
   curl -H "X-API-Key: ndn_live_..." https://api.ndnipfs.com/v1/pins
   ```

2. **JWT** (recommended for clients)
   ```bash
   curl -H "Authorization: Bearer eyJ..." https://api.ndnipfs.com/v1/pins
   ```

3. **SIWE** (Web3 wallets)
   ```bash
   curl -H "Authorization: Bearer siwe.<message>.<signature>" ...
   ```

### Network Security

| Control | Implementation |
|---------|----------------|
| DDoS Protection | Cloudflare Pro |
| WAF | Cloudflare WAF rules |
| TLS | TLS 1.3 enforced |
| Network Segmentation | VPC with private subnets |
| IDS/IPS | Cloud IDS enabled |

### Data Protection

| Data Type | Encryption | Key Management |
|-----------|------------|----------------|
| Database | AES-256 | Cloud SQL CMEK |
| Redis | AES-256 | In-transit TLS |
| IPFS | AES-256-GCM (optional) | Envelope keys |
| Backups | AES-256 | Cloud Storage CMEK |

### Compliance

- SOC 2 Type II: See `compliance/SOC2_CONTROLS.md`
- GDPR: Crypto-shredding enabled
- CCPA: Data export available
- HIPAA: BAA available for enterprise

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P0 | Complete outage | 15 minutes |
| P1 | Major degradation | 1 hour |
| P2 | Partial degradation | 4 hours |
| P3 | Minor issue | 24 hours |

### Runbooks

Available in `security/runbooks/`:

- `api-outage.md` - Complete API unavailability
- `database-failure.md` - PostgreSQL failover
- `cluster-partition.md` - IPFS Cluster network partition
- `security-breach.md` - Suspected breach response
- `ddos-attack.md` - DDoS mitigation

### Escalation Path

```
On-Call Engineer → Security Lead → CTO → CEO
```

### Communication

- Internal: Slack #incidents
- External: status.ndnipfs.com
- Enterprise: Dedicated Slack channel

---

## Scaling

### Horizontal Scaling

API Server auto-scales on Cloud Run:

```bash
# Configuration
gcloud run services update ndn-ipfs-api \
    --min-instances=2 \
    --max-instances=100 \
    --concurrency=80 \
    --cpu=2 \
    --memory=4Gi
```

### Database Scaling

```bash
# Add read replicas
gcloud sql replicas create ndnipfs-replica-2 \
    --master-instance=ndnipfs-primary \
    --region=us-east1

# Vertical scaling
gcloud sql instances patch ndnipfs-primary \
    --cpu=8 \
    --memory=32GB
```

### IPFS Cluster Scaling

```bash
# Add cluster node
# See gateway/kubernetes/cluster-node.yaml
kubectl apply -f gateway/kubernetes/cluster-node.yaml

# Should have odd number of nodes (3, 5, 7...)
```

### Capacity Planning

| Metric | Current | 6 Month Target | 12 Month Target |
|--------|---------|----------------|-----------------|
| Requests/sec | 1,000 | 10,000 | 100,000 |
| Pins | 1M | 10M | 100M |
| Storage | 100 TB | 1 PB | 10 PB |
| Regions | 1 | 3 | 7 |

---

## Troubleshooting

### Common Issues

#### 1. "CLUSTER_AUTH not configured"

```bash
# Check environment variable
echo $CLUSTER_AUTH

# Should be: username:password
# Regenerate if needed:
node scripts/generate-secrets.js
```

#### 2. "JWT_SECRET is required"

```bash
# Generate new secret
node scripts/generate-secrets.js --output .env.production

# Restart service
gcloud run services update ndn-ipfs-api \
    --set-env-vars JWT_SECRET=$(cat .env.production | grep JWT_SECRET | cut -d= -f2)
```

#### 3. Database connection failures

```bash
# Check Cloud SQL Proxy
kubectl logs -l app=cloud-sql-proxy

# Test connection
kubectl run psql --rm -it --image=postgres:16 \
    -- psql $DATABASE_URL -c "SELECT 1"
```

#### 4. High latency

```bash
# Check Cloud Monitoring
# Look for:
# - CPU throttling
# - Memory pressure
# - Network congestion

# Solutions:
# - Increase CPU/memory
# - Add read replicas
# - Enable CDN caching
```

### Support

- Documentation: `docs/`
- API Reference: `/docs` (Swagger UI)
- GitHub Issues: https://github.com/dnkefua/ndn-ipfs-chain
- Email: support@ndnipfs.com

---

## Appendix A: Health Check Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `/_health` | Basic health | `{"status":"ok"}` |
| `/healthz` | Kubernetes probe | `{"status":"ok"}` |
| `/v1/_discovery` | NDP discovery | Feature flags |
| `/metrics` | Prometheus metrics | OpenMetrics format |

## Appendix B: Default Ports

| Service | Port | Protocol |
|---------|------|----------|
| API Server | 3000 | HTTP |
| IPFS Kubo | 5001 | HTTP API |
| IPFS Cluster | 9094 | HTTP API |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |

## Appendix C: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-23 | Engineering | Initial production guide |
