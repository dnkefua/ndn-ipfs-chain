# NDN IPFS Chain - GCP Quick Start

Deploy to Google Cloud in 30 minutes.

---

## Prerequisites

- [ ] GCP account with billing enabled
- [ ] `gcloud` CLI installed
- [ ] Docker installed
- [ ] `kubectl` installed

---

## 1. Initialize GCP Project (5 min)

```bash
# Set variables
export PROJECT_ID="ndn-ipfs-chain"
export REGION="us-west1"
export API_KEY="your-strong-password-here"

# Create project
gcloud projects create $PROJECT_ID --name="NDN IPFS Chain"
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  cloudbuild.googleapis.com \
  artifact-registry.googleapis.com \
  compute.googleapis.com

# Enable billing
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

---

## 2. Create Artifact Registry (2 min)

```bash
gcloud artifacts repositories create ndn-ipfs \
  --repository-format=docker \
  --location=$REGION

gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## 3. Create Cloud SQL & Redis (5 min)

```bash
# PostgreSQL Database
gcloud sql instances create ndn-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=PD_SSD \
  --backup-start-time=02:00

# Create database and user
gcloud sql databases create ndnipfs --instance=ndn-postgres
gcloud sql users create ndn --instance=ndn-postgres --password

# Redis Cache
gcloud redis instances create ndn-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=7.0
```

Get connection details:

```bash
# PostgreSQL
gcloud sql instances describe ndn-postgres --format="value(connectionName)"

# Redis
gcloud redis instances describe ndn-redis --region=$REGION --format="value(host,port)"
```

---

## 4. Create VPC Connector (2 min)

```bash
gcloud compute networks vpc-connectors create ndn-vpc-connector \
  --region=$REGION \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10
```

---

## 5. Build and Push Images (5 min)

```bash
# Build API
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest api/server/
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest

# Build Dashboard
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest dashboard/
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest
```

---

## 6. Deploy API to Cloud Run (3 min)

```bash
# Get Cloud SQL connection string
SQL_CONNECTION=$(gcloud sql instances describe ndn-postgres --format="value(connectionName)")

# Get Redis connection details
REDIS_HOST=$(gcloud redis instances describe ndn-redis --region=$REGION --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe ndn-redis --region=$REGION --format="value(port)")

# Deploy API
gcloud run deploy ndn-api \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --set-env-vars=\
DATABASE_URL="postgresql://ndn:PASSWORD@/ndnipfs?unix_socket_dir=/cloudsql/${SQL_CONNECTION}",\
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}",\
JWT_SECRET="your-jwt-secret-here",\
NODE_ENV="production" \
  --add-cloudsql-instances=${SQL_CONNECTION} \
  --vpc-connector=ndn-vpc-connector
```

---

## 7. Deploy Dashboard (2 min)

```bash
# Get API URL
API_URL=$(gcloud run services describe ndn-api --region=$REGION --format='value(status.url)')

# Deploy Dashboard
gcloud run deploy ndn-dashboard \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars=NEXT_PUBLIC_API_URL="${API_URL}/v1"
```

---

## 8. Deploy IPFS Node (3 min)

### Option A: Cloud Run (Simpler)

```bash
gcloud run deploy kubo \
  --image=ipfs/kubo:v0.28.0 \
  --platform=managed \
  --region=$REGION \
  --memory=4Gi \
  --cpu=4 \
  --port=5001 \
  --allow-unauthenticated
```

### Option B: Compute Engine (Better for IPFS)

```bash
gcloud compute instances create kubo-node \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --machine-type=e2-standard-4 \
  --zone=${REGION}-b \
  --boot-disk-size=100GB

# SSH in and run:
# sudo apt-get install docker.io -y
# docker run -d -p 4001:4001 -p 5001:5001 ipfs/kubo:v0.28.0
```

---

## 9. Verify Deployment (3 min)

```bash
# Get service URLs
gcloud run services describe ndn-api --region=$REGION --format='value(status.url)'
gcloud run services describe ndn-dashboard --region=$REGION --format='value(status.url)'

# Test API health
API_URL=$(gcloud run services describe ndn-api --region=$REGION --format='value(status.url)')
curl ${API_URL}/health

# Test dashboard
DASHBOARD_URL=$(gcloud run services describe ndn-dashboard --region=$REGION --format='value(status.url)')
echo "Dashboard: ${DASHBOARD_URL}"
```

---

## 10. Run Integration Tests (2 min)

```bash
cd tests
API_URL=${API_URL} npm test
```

---

## Complete Script (Copy & Paste)

```bash
#!/bin/bash
set -e

# Configuration
PROJECT_ID="ndn-ipfs-chain"
REGION="us-west1"

echo "🚀 Deploying NDN IPFS Chain to GCP..."

# 1. Project setup
echo "📦 Setting up GCP project..."
gcloud projects create $PROJECT_ID --name="NDN IPFS Chain" 2>/dev/null || true
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  cloudbuild.googleapis.com \
  artifact-registry.googleapis.com

# 2. Artifact Registry
echo "🐳 Setting up Artifact Registry..."
gcloud artifacts repositories create ndn-ipfs \
  --repository-format=docker \
  --location=$REGION 2>/dev/null || true

gcloud auth configure-docker ${REGION}-docker.pkg.dev

# 3. Cloud SQL
echo "🗄️  Creating Cloud SQL..."
gcloud sql instances create ndn-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=PD_SSD 2>/dev/null || true

gcloud sql databases create ndnipfs --instance=ndn-postgres 2>/dev/null || true
gcloud sql users create ndn --instance=ndn-postgres --password 2>/dev/null || true

# 4. Redis
echo "⚡ Creating Redis..."
gcloud redis instances create ndn-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=7.0 2>/dev/null || true

# 5. VPC Connector
echo "🔗 Creating VPC Connector..."
gcloud compute networks vpc-connectors create ndn-vpc-connector \
  --region=$REGION \
  --subnet=default 2>/dev/null || true

# 6. Build images
echo "🏗️  Building Docker images..."
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest api/server/
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest

docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest dashboard/
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest

# 7. Get credentials
echo "📝 Getting connection credentials..."
SQL_CONNECTION=$(gcloud sql instances describe ndn-postgres --format="value(connectionName)")
REDIS_HOST=$(gcloud redis instances describe ndn-redis --region=$REGION --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe ndn-redis --region=$REGION --format="value(port)")

# 8. Deploy API
echo "🚀 Deploying API to Cloud Run..."
gcloud run deploy ndn-api \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-api:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --set-env-vars=\
DATABASE_URL="postgresql://ndn:password@/ndnipfs?unix_socket_dir=/cloudsql/${SQL_CONNECTION}",\
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}",\
NODE_ENV="production" \
  --add-cloudsql-instances=${SQL_CONNECTION} \
  --vpc-connector=ndn-vpc-connector

# 9. Deploy Dashboard
echo "🎨 Deploying Dashboard..."
API_URL=$(gcloud run services describe ndn-api --region=$REGION --format='value(status.url)')

gcloud run deploy ndn-dashboard \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ndn-ipfs/ndn-dashboard:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars=NEXT_PUBLIC_API_URL="${API_URL}/v1"

# 10. Success
echo "✅ Deployment complete!"
echo ""
echo "📊 Service URLs:"
echo "API: ${API_URL}"
echo "Dashboard: $(gcloud run services describe ndn-dashboard --region=$REGION --format='value(status.url)')"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS to point to these URLs"
echo "2. Run integration tests: cd tests && API_URL=${API_URL} npm test"
echo "3. Monitor: gcloud logging read 'resource.type=cloud_run_revision' --limit=50"
```

Save as `deploy-gcp.sh`, then:

```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

---

## Cost Check

```bash
# View current usage
gcloud billing accounts describe BILLING_ACCOUNT_ID --format='table(displayName,masterBillingAccountName)'

# Set budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="NDN Budget" \
  --budget-amount=500 \
  --threshold-rule=percent=100
```

**Expected Cost:** $260-370/month

---

## Troubleshooting

### Cloud Run can't connect to Cloud SQL

```bash
# Add VPC connector to deployment
gcloud run services update ndn-api \
  --vpc-connector=ndn-vpc-connector \
  --region=$REGION
```

### Images won't push to Artifact Registry

```bash
# Verify authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Check permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
```

### Redis connection timeout

```bash
# Verify Memorystore is in same region
gcloud redis instances describe ndn-redis --region=$REGION

# Check VPC connector
gcloud compute networks vpc-connectors describe ndn-vpc-connector --region=$REGION
```

---

## What's Next

1. **Configure Domain:** Update DNS to point to Cloud Run services
2. **Set Up CI/CD:** Connect GitHub/GitLab to Cloud Build
3. **Add Monitoring:** Set up alerts for uptime, errors
4. **Go Live:** Onboard first users!

See [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md) for detailed configuration.

---

**Total Time:** ~30 minutes from start to deployed  
**Cost:** ~$260-370/month  
**Status:** ✅ Ready for production
