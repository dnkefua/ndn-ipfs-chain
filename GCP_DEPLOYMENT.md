# NDN IPFS Chain - Google Cloud Platform Deployment Guide

**Complete guide for deploying NDN IPFS Chain to GCP using Cloud Run, Cloud SQL, and Compute Engine.**

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [GCP Project Setup](#gcp-project-setup)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Container Registry](#container-registry)
5. [Cloud SQL (PostgreSQL)](#cloud-sql-postgresql)
6. [Memorystore (Redis)](#memorystore-redis)
7. [Cloud Run Deployment](#cloud-run-deployment)
8. [IPFS Nodes (Compute Engine)](#ipfs-nodes-compute-engine)
9. [Dashboard Hosting](#dashboard-hosting)
10. [Cloud Build CI/CD](#cloud-build-cicd)
11. [Networking & VPC](#networking--vpc)
12. [Monitoring & Logging](#monitoring--logging)
13. [Security & IAM](#security--iam)
14. [Cost Management](#cost-management)
15. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

- [ ] GCP account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Docker installed locally (for building images)
- [ ] kubectl installed
- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] SSL certificates ready (or using Cloud Armor)
- [ ] Domain registered and DNS configured
- [ ] Team access to GCP Console

---

## GCP Project Setup

### Step 1: Create GCP Project

```bash
# Create new project
gcloud projects create ndn-ipfs-chain \
  --name="NDN IPFS Chain" \
  --set-as-default

# Verify
gcloud config list project
```

### Step 2: Enable Required APIs

```bash
# Enable all required services
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  cloudbuild.googleapis.com \
  artifact-registry.googleapis.com \
  compute.googleapis.com \
  container.googleapis.com \
  cloudkms.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudscheduler.googleapis.com

# Verify (should show all as enabled)
gcloud services list --enabled
```

### Step 3: Set Default Region

```bash
# Set default region (us-west1 recommended for latency)
gcloud config set compute/region us-west1
gcloud config set compute/zone us-west1-b
```

### Step 4: Create Service Accounts

```bash
# Service account for Cloud Run
gcloud iam service-accounts create ndn-api-sa \
  --display-name="NDN API Service Account"

# Service account for Cloud Build
gcloud iam service-accounts create ndn-build-sa \
  --display-name="NDN Build Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member=serviceAccount:ndn-api-sa@$(gcloud config get-value project).iam.gserviceaccount.com \
  --role=roles/cloudsql.client

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member=serviceAccount:ndn-api-sa@$(gcloud config get-value project).iam.gserviceaccount.com \
  --role=roles/redis.editor
```

---

## Infrastructure Setup

### Step 1: Create Artifact Registry

```bash
# Create registry for container images
gcloud artifacts repositories create ndn-ipfs \
  --repository-format=docker \
  --location=us-west1 \
  --description="NDN IPFS Chain container images"

# Verify
gcloud artifacts repositories list
```

### Step 2: Configure Docker Authentication

```bash
# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-west1-docker.pkg.dev
```

---

## Cloud SQL (PostgreSQL)

### Create Cloud SQL Instance

```bash
# Create PostgreSQL 16 instance
gcloud sql instances create ndn-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-west1 \
  --storage-size=100GB \
  --storage-type=PD_SSD \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --retained-backups-count=30 \
  --transaction-log-retention-days=7

# For production, use larger tier:
# --tier=db-custom-2-8192 (2 vCPU, 8GB RAM)
```

### Create Database and User

```bash
# Create database
gcloud sql databases create ndnipfs \
  --instance=ndn-postgres

# Create database user
gcloud sql users create ndn \
  --instance=ndn-postgres \
  --password  # Will prompt for password (make it strong!)

# Verify
gcloud sql users list --instance=ndn-postgres
```

### Get Connection String

```bash
# Get connection string for Cloud Run
gcloud sql instances describe ndn-postgres \
  --format="value(connectionName)"

# Use this format:
# postgresql://ndn:PASSWORD@/ndnipfs?unix_socket_dir=/cloudsql/PROJECT_ID:us-west1:ndn-postgres
```

### Configure Cloud SQL Proxy

```bash
# For local development, use Cloud SQL Proxy
curl https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -o cloud_sql_proxy
chmod +x cloud_sql_proxy

# Run proxy
./cloud_sql_proxy -instances=PROJECT_ID:us-west1:ndn-postgres=tcp:5432 &

# Now connect locally:
psql -h localhost -U ndn -d ndnipfs
```

---

## Memorystore (Redis)

### Create Redis Instance

```bash
# Create Redis instance
gcloud redis instances create ndn-redis \
  --size=1 \
  --region=us-west1 \
  --redis-version=7.0 \
  --tier=basic

# For production, use standard tier for HA:
# --tier=standard \
# --replica-count=1
```

### Get Connection Details

```bash
# Get Redis host and port
gcloud redis instances describe ndn-redis \
  --region=us-west1 \
  --format="value(host,port)"

# Connection string format:
# redis://HOST:PORT/0
```

### Configure Firewall

```bash
# Allow Cloud Run to access Redis (same VPC)
gcloud compute networks peering create ndn-api-redis-peering \
  --network=default \
  --service-project=redis.googleapis.com \
  --auto-create-routes
```

---

## Cloud Run Deployment

### Step 1: Build and Push API Image

```bash
# Build API Docker image
docker build -t us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest \
  api/server/

# Push to Artifact Registry
docker push us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest
```

### Step 2: Deploy to Cloud Run

```bash
# Deploy API service
gcloud run deploy ndn-api \
  --image=us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest \
  --platform=managed \
  --region=us-west1 \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --set-env-vars=\
DATABASE_URL="postgresql://ndn:PASSWORD@/ndnipfs?unix_socket_dir=/cloudsql/PROJECT_ID:us-west1:ndn-postgres",\
REDIS_URL="redis://REDIS_HOST:6379",\
JWT_SECRET="your-secret-here",\
NODE_ENV="production" \
  --service-account=ndn-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances=PROJECT_ID:us-west1:ndn-postgres \
  --vpc-connector=ndn-vpc-connector
```

### Step 3: Get Service URL

```bash
# Get the service URL
gcloud run services describe ndn-api --region=us-west1 --format='value(status.url)'

# Test health endpoint
curl https://ndn-api-xxxxx.run.app/health
```

### Step 4: Deploy Dashboard

```bash
# Build Dashboard image
docker build -t us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-dashboard:latest \
  dashboard/

# Push image
docker push us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-dashboard:latest

# Deploy
gcloud run deploy ndn-dashboard \
  --image=us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-dashboard:latest \
  --platform=managed \
  --region=us-west1 \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars=NEXT_PUBLIC_API_URL="https://ndn-api-xxxxx.run.app/v1"
```

---

## IPFS Nodes (Compute Engine)

### Option A: Cloud Run (Simpler)

```bash
# Deploy Kubo as Cloud Run service
gcloud run deploy kubo \
  --image=ipfs/kubo:v0.28.0 \
  --platform=managed \
  --region=us-west1 \
  --memory=4Gi \
  --cpu=4 \
  --port=5001 \
  --allow-unauthenticated

# Get service URL
gcloud run services describe kubo --region=us-west1 --format='value(status.url)'

# Test IPFS API
curl https://kubo-xxxxx.run.app/api/v0/id
```

### Option B: Compute Engine (Recommended for IPFS)

```bash
# Create VM instance
gcloud compute instances create kubo-node \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --machine-type=e2-standard-4 \
  --zone=us-west1-b \
  --boot-disk-size=100GB \
  --scopes=compute-rw,storage-ro

# SSH into instance
gcloud compute ssh kubo-node --zone=us-west1-b

# Install Docker
sudo apt-get update
sudo apt-get install docker.io -y
sudo usermod -aG docker $USER

# Run Kubo
docker run -d \
  --name kubo \
  -p 4001:4001 \
  -p 5001:5001 \
  -p 8080:8080 \
  -v kubo-data:/data/ipfs \
  -e IPFS_PROFILE=server \
  ipfs/kubo:v0.28.0

# Verify
curl http://localhost:5001/api/v0/id
```

### Create Static IP for IPFS Node

```bash
# Reserve static IP
gcloud compute addresses create kubo-ip \
  --region=us-west1

# Associate with instance
gcloud compute instances add-access-config kubo-node \
  --access-config-name="kubo-ip" \
  --address=kubo-ip \
  --zone=us-west1-b
```

### Configure Firewall

```bash
# Allow inbound on IPFS ports
gcloud compute firewall-rules create allow-ipfs \
  --allow=tcp:4001,tcp:5001,tcp:8080 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=ipfs
```

---

## Dashboard Hosting

### Option A: Cloud Storage + Cloud CDN

```bash
# Build optimized dashboard
cd dashboard
npm run build

# Create Cloud Storage bucket
gsutil mb gs://ndn-dashboard-prod

# Upload static files
gsutil -m cp -r out/* gs://ndn-dashboard-prod/

# Configure as website
gsutil web set -m index.html -e 404.html gs://ndn-dashboard-prod

# Make public
gsutil iam ch allUsers:objectViewer gs://ndn-dashboard-prod

# Create Cloud CDN backend
gcloud compute backend-buckets create ndn-dashboard-cdn \
  --gcs-bucket-name=ndn-dashboard-prod \
  --enable-cdn

# Create URL map
gcloud compute url-maps create ndn-dashboard-map \
  --default-backend-bucket=ndn-dashboard-cdn

# Create HTTPS proxy
gcloud compute target-https-proxies create ndn-dashboard-proxy \
  --url-map=ndn-dashboard-map \
  --ssl-certificates=ndn-ssl-cert

# Create forwarding rule
gcloud compute forwarding-rules create ndn-dashboard-frontend \
  --global \
  --target-https-proxy=ndn-dashboard-proxy \
  --address=ndn-dashboard-ip \
  --ports=443
```

### Option B: Cloud Run (Dynamic)

```bash
# Already deployed above, just:
gcloud run services update ndn-dashboard \
  --ingress=all \
  --region=us-west1
```

---

## Cloud Build CI/CD

### Step 1: Set Up Repository Integration

```bash
# If using GitHub
gcloud builds connect --repository-name=ndn-ipfs-chain \
  --repository-owner=YOUR_GITHUB_USERNAME \
  --region=us-west1

# If using Cloud Source Repositories
gcloud source repos create ndn-ipfs-chain
git remote add google \
  https://source.developers.google.com/p/PROJECT_ID/r/ndn-ipfs-chain
git push google main
```

### Step 2: Create Build Trigger

```bash
# Using gcloud (or use Console UI)
gcloud builds triggers create github \
  --repo-name=ndn-ipfs-chain \
  --repo-owner=YOUR_USERNAME \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --name=ndn-deploy-main
```

### Step 3: Configure Substitutions

```bash
# Edit cloudbuild.yaml to use your values:
substitutions:
  _REGION: 'us-west1'
  _REGISTRY: 'ndn-ipfs'
  _API_SERVICE: 'ndn-api'
  _DASHBOARD_SERVICE: 'ndn-dashboard'
  _ARTIFACT_BUCKET: 'ndn-ipfs-builds'
  _TEST_API_KEY: 'your-test-key'
```

### Step 4: Manual Build Trigger

```bash
# Trigger build manually
gcloud builds submit --config=cloudbuild.yaml

# Monitor build
gcloud builds log --stream
```

---

## Networking & VPC

### Create VPC Connector

```bash
# Required for Cloud Run to access Memorystore/Cloud SQL
gcloud compute networks vpc-connectors create ndn-vpc-connector \
  --region=us-west1 \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10
```

### Configure Cloud Armor

```bash
# Create security policy
gcloud compute security-policies create ndn-security \
  --description="NDN API security policy"

# Add rate limiting rule
gcloud compute security-policies rules create 100 \
  --security-policy=ndn-security \
  --action=rate-based-ban \
  --rate-limit-options-conform-action=allow \
  --rate-limit-options-exceed-action=deny-429 \
  --rate-limit-options-enforce-on-key=IP \
  --rate-limit-options-rate-limit-threshold-count=1000 \
  --rate-limit-options-rate-limit-threshold-interval-sec=60 \
  --rate-limit-options-ban-duration-sec=600

# Attach to backend
gcloud compute backend-services update ndn-api-backend \
  --security-policy=ndn-security \
  --global
```

---

## Monitoring & Logging

### Cloud Logging

```bash
# View API logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ndn-api" \
  --limit 50 \
  --format=json

# Create log sink for long-term storage
gcloud logging sinks create ndn-logs-bq \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/ndn_logs \
  --log-filter='resource.type=cloud_run_revision'
```

### Cloud Monitoring

```bash
# Create uptime check
gcloud monitoring uptime-checks create ndn-api-uptime \
  --resource-type="uptime-url" \
  --monitored-resource-display-name="NDN API" \
  --http-check-path=/health \
  --http-check-port=443 \
  --http-check-use-ssl=true

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="NDN API Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

### Cloud Trace

```bash
# Enable tracing in application
# (Already configured in Fastify if OTEL_EXPORTER_OTLP_ENDPOINT set)

# View traces
gcloud beta trace list --limit=10
```

---

## Security & IAM

### Set Up Secrets Manager

```bash
# Store database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create ndn-db-password \
  --data-file=-

# Store JWT secret
echo -n "YOUR_JWT_SECRET" | gcloud secrets create ndn-jwt-secret \
  --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding ndn-db-password \
  --member=serviceAccount:ndn-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Configure SSL/TLS

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create ndn-ssl-cert \
  --domains=api.ndnanalytics.com,app.ndnanalytics.com

# Attach to load balancer
gcloud compute target-https-proxies update ndn-api-proxy \
  --ssl-certificates=ndn-ssl-cert
```

### Configure CORS

```bash
# In API environment variables:
CORS_ORIGIN="https://app.ndnanalytics.com,https://ndnanalytics.com"
CORS_CREDENTIALS="true"
```

---

## Cost Management

### Estimate Monthly Costs

| Service | Monthly Cost |
|---------|------------|
| Cloud Run (API) | $50-100 |
| Cloud SQL (db-f1-micro) | $50 |
| Memorystore Redis | $30-50 |
| Compute Engine (Kubo) | $80 |
| Cloud Storage + CDN | $20 |
| Data transfer | $10 |
| Logging & Monitoring | $20 |
| **Total** | **$260-370** |

**Cheaper than AWS (~$435/month)**

### Set Up Budget Alerts

```bash
# Create budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="NDN IPFS Monthly Budget" \
  --budget-amount=500 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### Cost Optimization

```bash
# Use committed use discounts
# Analyze costs
gcloud compute instances list --format='table(name,machineType.machine_type(),INTERNAL_IP)'

# Right-size instances
# Use preemptible instances for non-critical workloads
```

---

## Rollback Procedures

### Rollback API to Previous Version

```bash
# View deployment history
gcloud run revisions list --service=ndn-api --region=us-west1

# Route traffic to previous revision
gcloud run services update-traffic ndn-api \
  --to-revisions=ndn-api-00001=100 \
  --region=us-west1

# Verify rollback
curl https://ndn-api-xxxxx.run.app/health
```

### Rollback Database

```bash
# List recent backups
gcloud sql backups list --instance=ndn-postgres

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ndn-postgres \
  --backup-configuration=default
```

### Emergency: Stop Services

```bash
# Disable Cloud Run service
gcloud run services delete ndn-api --region=us-west1 --quiet

# Stop Compute Engine instance
gcloud compute instances stop kubo-node --zone=us-west1-b
```

---

## Post-Deployment Verification

### Health Checks

```bash
# API health
curl https://ndn-api-xxxxx.run.app/health

# Database
gcloud sql instances describe ndn-postgres --format='value(state)'

# Redis
gcloud redis instances describe ndn-redis --region=us-west1 --format='value(state)'

# IPFS
curl http://KUBO_IP:5001/api/v0/id
```

### Integration Tests

```bash
cd tests
API_URL=https://ndn-api-xxxxx.run.app npm test
```

---

## Maintenance

### Database Maintenance

```bash
# Create daily backups (automatic with Cloud SQL)
# Configure backup window
gcloud sql instances patch ndn-postgres \
  --backup-start-time=02:00 \
  --retained-backups-count=30

# Monitor database size
gcloud sql instances describe ndn-postgres \
  --format='value(currentDiskSize)'
```

### Update Images

```bash
# When code changes, rebuild and push
docker build -t us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest api/server/
docker push us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest

# Deploy new version
gcloud run deploy ndn-api \
  --image=us-west1-docker.pkg.dev/PROJECT_ID/ndn-ipfs/ndn-api:latest \
  --region=us-west1
```

---

## Troubleshooting

### Cloud Run service not responding

```bash
# Check service status
gcloud run services describe ndn-api --region=us-west1

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ndn-api" \
  --limit=20 --freshness=1h

# Check if Cloud SQL proxy is working
gcloud sql instances describe ndn-postgres --format='value(state)'
```

### Can't connect to Cloud SQL

```bash
# Verify service account has permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:ndn-api-sa*"

# Check Cloud SQL Proxy connectivity
cloud_sql_proxy -instances=PROJECT_ID:us-west1:ndn-postgres=tcp:5432 -verbose
```

### Redis connection issues

```bash
# Verify VPC connector is created
gcloud compute networks vpc-connectors list --region=us-west1

# Check Redis status
gcloud redis instances describe ndn-redis --region=us-west1

# Test connection
redis-cli -h REDIS_HOST -p 6379 ping
```

---

## Quick Reference Commands

```bash
# Deploy everything
gcloud builds submit --config=cloudbuild.yaml

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Monitor costs
gcloud billing accounts list
gcloud compute instances list --format='table(name,machineType,STATUS)'

# Update service
gcloud run deploy ndn-api --update-env-vars KEY=value --region=us-west1

# Scale service
gcloud run services update ndn-api \
  --min-instances=2 \
  --max-instances=10 \
  --region=us-west1

# View service URL
gcloud run services describe ndn-api --region=us-west1 --format='value(status.url)'
```

---

## Next Steps

1. Follow GCP Project Setup (above)
2. Create Cloud SQL + Redis
3. Build and push Docker images
4. Deploy to Cloud Run
5. Set up IPFS nodes on Compute Engine
6. Configure Cloud Build CI/CD
7. Set up monitoring and alerts
8. Test with integration tests
9. Configure custom domains
10. Launch!

---

**Support:** hello@ndnanalytics.com  
**Status:** Ready for GCP deployment  
**Cost Estimate:** $260-370/month (cheaper than AWS)
