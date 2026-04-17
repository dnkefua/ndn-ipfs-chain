# NDN IPFS Chain — Production Deployment Guide

**Complete guide for deploying NDN IPFS Chain to production with Docker, Kubernetes, and CI/CD.**

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Testing with Docker Compose](#local-testing)
3. [Production Deployment](#production-deployment)
4. [Kubernetes Setup](#kubernetes)
5. [CI/CD Pipeline](#cicd)
6. [Monitoring & Observability](#monitoring)
7. [Security Hardening](#security)
8. [Launch Day Checklist](#launch-checklist)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (`npm test` / `go test ./...`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles without errors
- [ ] No console.log statements in production code
- [ ] Environment variables documented

### Security
- [ ] API keys are secrets (never in code)
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection protection verified
- [ ] No hardcoded credentials

### Infrastructure
- [ ] Database backups configured
- [ ] Redis persistence enabled
- [ ] IPFS node health checked
- [ ] Cluster peer discovery working
- [ ] Monitoring stack deployed

### API Testing
- [ ] All endpoints return expected status codes
- [ ] Error handling works (400, 401, 404, 500)
- [ ] Rate limits are enforced
- [ ] Large file uploads work
- [ ] Concurrent requests handled

### SDK Testing
- [ ] JS SDK builds and installs from npm
- [ ] Python SDK imports correctly
- [ ] Go SDK compiles
- [ ] CLI tools work end-to-end

---

## Local Testing with Docker Compose

### 1. Build All Services

```bash
cd dev
docker-compose build
```

### 2. Start Full Stack

```bash
docker-compose up -d
```

Services will start in this order:
1. PostgreSQL (port 5432)
2. Redis (port 6379)
3. Kubo (ports 4001, 5001, 8080)
4. IPFS Cluster (ports 9094, 9095)
5. API Server (port 3000)
6. Dashboard (port 3001)

### 3. Verify Services

```bash
# Check all containers running
docker-compose ps

# Expected output:
# NAME              STATUS
# postgres          Up 2 minutes (healthy)
# redis             Up 2 minutes (healthy)
# kubo              Up 2 minutes (healthy)
# cluster           Up 2 minutes (healthy)
# api               Up 1 minute (healthy)
# dashboard         Up 1 minute

# Test API
curl http://localhost:3000/health

# Test dashboard
open http://localhost:3001
```

### 4. Run Integration Tests

```bash
docker-compose run tests
```

Expected output:
```
✓ Auth tests (6/6)
✓ Pin tests (8/8)
✓ Analytics tests (5/5)
✓ Gateway tests (4/4)
✓ Error handling (6/6)

All tests passed! ✓
```

### 5. Load Test (Optional)

```bash
# Install k6
brew install k6  # macOS

# Run load test (100 concurrent users, 5 min)
k6 run load-test.js
```

### 6. Cleanup

```bash
docker-compose down -v  # Remove volumes too
```

---

## Production Deployment

### Option A: Docker Swarm (Single Server)

```bash
# Build images
docker build -t ndnipfs/api:latest api/server/
docker build -t ndnipfs/dashboard:latest dashboard/

# Push to registry
docker push ndnipfs/api:latest
docker push ndnipfs/dashboard:latest

# Deploy stack
docker stack deploy -c docker-compose.prod.yaml ndn-prod
```

### Option B: AWS ECS Fargate (Recommended for MVP)

```bash
# 1. Create ECR repositories
aws ecr create-repository --repository-name ndnipfs-api
aws ecr create-repository --repository-name ndnipfs-dashboard

# 2. Push images
docker tag ndnipfs/api:latest $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ndnipfs-api:latest
docker push $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ndnipfs-api:latest

# 3. Deploy via Terraform (see terraform/ folder)
cd terraform/
terraform init
terraform plan
terraform apply
```

### Option C: Kubernetes (Multi-Region)

```bash
# 1. Create clusters (gcloud or aws cli)
kubectl create namespace ndn-prod

# 2. Deploy secrets
kubectl create secret generic ndn-secrets \
  --from-literal=db-password=... \
  --from-literal=jwt-secret=... \
  -n ndn-prod

# 3. Deploy manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/dashboard-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# 4. Verify
kubectl get pods -n ndn-prod
kubectl logs -f deployment/api -n ndn-prod
```

---

## Kubernetes Setup

### 1. Cluster Requirements

```yaml
# Minimum spec for MVP
Master nodes: 3 (t3.medium on AWS)
Worker nodes: 5 (t3.large on AWS)
Total vCPU: 20
Total RAM: 40 GB
Storage: 500 GB (EBS gp3)
```

### 2. Deploy Ingress Controller

```bash
# Install Nginx Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Verify
kubectl get svc -n ingress-nginx
```

### 3. Configure TLS

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create certificate issuer
kubectl apply -f k8s/cert-issuer.yaml
```

### 4. Deploy Monitoring Stack

```bash
# Install Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-grafana 3000:80
# Open: http://localhost:3000 (admin/prom-operator)
```

### 5. Setup Auto-scaling

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Deploy HPA for API
kubectl apply -f k8s/api-hpa.yaml
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yaml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]

env:
  AWS_REGION: us-west-2
  ECR_REPOSITORY_API: ndnipfs-api
  ECR_REPOSITORY_DASHBOARD: ndnipfs-dashboard

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      # Test
      - name: Run Tests
        run: |
          npm install
          npm run test

      # Build API
      - name: Build API Docker image
        run: |
          docker build -t $ECR_REPOSITORY_API:${{ github.sha }} api/server/

      # Build Dashboard
      - name: Build Dashboard Docker image
        run: |
          docker build -t $ECR_REPOSITORY_DASHBOARD:${{ github.sha }} dashboard/

      # Push to ECR
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Push API to ECR
        run: |
          docker tag $ECR_REPOSITORY_API:${{ github.sha }} ${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_API:latest
          docker push ${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_API:latest

      - name: Push Dashboard to ECR
        run: |
          docker tag $ECR_REPOSITORY_DASHBOARD:${{ github.sha }} ${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_DASHBOARD:latest
          docker push ${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_DASHBOARD:latest

      # Deploy to ECS/Kubernetes
      - name: Deploy to Production
        run: |
          kubectl set image deployment/api api=${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_API:latest -n ndn-prod
          kubectl set image deployment/dashboard dashboard=${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY_DASHBOARD:latest -n ndn-prod
          kubectl rollout status deployment/api -n ndn-prod
```

### Manual Deployment (If not using CI/CD)

```bash
# 1. Build everything
npm run build  # dashboard
go build ./...  # SDKs
docker build -t ndnipfs/api:v1.0.0 api/server/

# 2. Tag and push
docker tag ndnipfs/api:v1.0.0 $REGISTRY/ndnipfs-api:v1.0.0
docker push $REGISTRY/ndnipfs-api:v1.0.0

# 3. Deploy
kubectl set image deployment/api api=$REGISTRY/ndnipfs-api:v1.0.0 -n ndn-prod
kubectl rollout status deployment/api -n ndn-prod

# 4. Verify
curl https://api.ndnipfs.link/health
```

---

## Monitoring & Observability

### 1. Logs

**ECS:** CloudWatch Logs (auto-collected)  
**Kubernetes:** ELK Stack or Loki

```bash
# Kubernetes logs
kubectl logs -f deployment/api -n ndn-prod
kubectl logs -f --all-containers=true -n ndn-prod

# Follow all logs across cluster
stern "api|dashboard|postgres" -n ndn-prod
```

### 2. Metrics

**Prometheus scrapes:**
- API response time
- Database query latency
- IPFS peer count
- Filecoin deal status

```bash
# Query Prometheus
curl http://prometheus:9090/api/v1/query?query=up

# Dashboards
- Kubernetes cluster (Grafana)
- API performance
- IPFS network health
- Filecoin deals
```

### 3. Alerting

```yaml
# Prometheus alert rules
groups:
  - name: ndn-alerts
    rules:
      - alert: APIDown
        expr: up{job="api"} == 0
        for: 2m
        annotations:
          summary: "API is down"

      - alert: HighErrorRate
        expr: rate(api_errors_total[5m]) > 0.05
        annotations:
          summary: "API error rate > 5%"

      - alert: DatabaseDown
        expr: pg_up == 0
        annotations:
          summary: "PostgreSQL is down"
```

### 4. Tracing

```bash
# Deploy Jaeger
kubectl apply -f k8s/jaeger-deployment.yaml

# View traces
open http://localhost:16686  # Jaeger UI
```

---

## Security Hardening

### 1. Network Security

```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ingress
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

### 2. RBAC (Role-Based Access Control)

```bash
# Create limited service account for API
kubectl create serviceaccount api -n ndn-prod

# Assign minimal permissions
kubectl apply -f k8s/api-rbac.yaml
```

### 3. Secrets Management

```bash
# Use AWS Secrets Manager or Kubernetes Secrets
aws secretsmanager create-secret --name ndn/jwt-secret --secret-string "..."

# Or with kubectl
kubectl create secret generic ndn-secrets \
  --from-literal=jwt-secret=... \
  --from-literal=stripe-key=... \
  -n ndn-prod
```

### 4. Pod Security

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsReadOnlyRootFilesystem: true
  containers:
    - name: api
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
      resources:
        limits:
          cpu: "500m"
          memory: "512Mi"
        requests:
          cpu: "250m"
          memory: "256Mi"
```

### 5. TLS/HTTPS

```bash
# All external traffic must be TLS
# Configure Ingress with cert-manager
kubectl apply -f k8s/ingress-tls.yaml

# Verify
curl https://api.ndnipfs.link/health  # Works
curl http://api.ndnipfs.link/health   # Redirects to HTTPS
```

---

## Launch Checklist

### Day 1 (Internal Testing)

- [ ] Docker Compose environment fully tested
- [ ] All integration tests pass
- [ ] Load testing shows acceptable performance
- [ ] Database backups working
- [ ] Monitoring dashboards populated
- [ ] Alerts configured and tested

### Day 2 (Staging Deployment)

- [ ] Push to staging environment
- [ ] Run smoke tests against staging
- [ ] Test all SDKs against staging API
- [ ] Dashboard works end-to-end
- [ ] MCP server works with Claude
- [ ] Security scan passes (OWASP)

### Day 3 (Production Deployment)

- [ ] DNS updated to point to production
- [ ] SSL certificates deployed
- [ ] First batch of beta users onboarded
- [ ] Monitoring active and alerting
- [ ] Incident response plan in place
- [ ] Team on-call schedule published

### Day 4+ (Launch Maintenance)

- [ ] Monitor error rates (<0.1% target)
- [ ] Watch database growth
- [ ] Respond to user feedback
- [ ] Scale up if needed
- [ ] Blog post + social media
- [ ] Email beta users with product link

---

## Rollback Procedure

If production issues occur:

```bash
# Kubernetes rollback
kubectl rollout undo deployment/api -n ndn-prod
kubectl rollout history deployment/api -n ndn-prod

# Immediate response
1. Alert team on-call
2. Rollback to last stable version
3. Investigate logs + metrics
4. Fix in development
5. Test in staging
6. Re-deploy to production
```

---

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API latency (p95) | <100ms | Prometheus histogram |
| Error rate | <0.1% | CloudWatch Logs |
| Availability | 99.9% | Uptime robot |
| Database latency (p95) | <10ms | PostgreSQL logs |
| TTFB (gateway) | <200ms | Synthetic monitoring |

---

## Cost Estimate (AWS, MVP Scale)

| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate (API) | $150 |
| RDS PostgreSQL | $100 |
| ElastiCache Redis | $30 |
| EBS Storage (500 GB) | $50 |
| NAT Gateway | $45 |
| Data transfer (100 GB) | $10 |
| CloudWatch / Monitoring | $50 |
| **Total** | **~$435/month** |

Can scale to $1-2K/month at 1M DAU with autoscaling.

---

## Next Steps

1. ✅ Local testing complete
2. ⬜ Deploy to staging
3. ⬜ Run load tests
4. ⬜ Security audit
5. ⬜ Production deployment
6. ⬜ Monitor first week closely
7. ⬜ Scale based on demand

---

**Questions?** Refer to service-specific docs:
- [API Server README](./api/server/README.md)
- [Dashboard README](./dashboard/README.md)
- [Kubernetes Setup](./k8s/README.md)
- [CI/CD Setup](./.github/workflows/README.md)

**Support:** hello@ndnanalytics.com
