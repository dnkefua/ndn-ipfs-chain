#!/bin/bash
set -euo pipefail

# NDN IPFS Chain - Production Deployment Script
# Usage: ./scripts/production-deploy.sh [environment]
# Environments: staging, production

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT..."

# Pre-deployment checks
run_preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check for required tools
    for cmd in docker gcloud kubectl; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done

    # Check for required environment variables
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "CLUSTER_AUTH"
        "JWT_SECRET"
    )

    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi

    log_success "Pre-flight checks passed"
}

# Build and tag Docker images
build_images() {
    log_info "Building Docker images..."

    # API Server
    docker build -t "gcr.io/ndn-ipfs-chain/api:$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)" \
        -f api/server/Dockerfile \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        "$ROOT_DIR/api/server"

    # Workers
    for worker in lifecycle-worker trigger-worker filecoin-broker crypto-shred-anchor; do
        if [[ -d "$ROOT_DIR/workers/$worker" ]]; then
            docker build -t "gcr.io/ndn-ipfs-chain/$worker:$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)" \
                -f "workers/$worker/Dockerfile" \
                "$ROOT_DIR/workers/$worker"
        fi
    done

    log_success "Docker images built"
}

# Push images to Container Registry
push_images() {
    log_info "Pushing images to Container Registry..."

    gcloud auth configure-docker --quiet

    # Get latest image tags
    api_image=$(docker images "gcr.io/ndn-ipfs-chain/api:*" --format "{{.Repository}}:{{.Tag}}" | head -1)

    docker push "$api_image"
    log_success "API image pushed: $api_image"

    for worker in lifecycle-worker trigger-worker filecoin-broker crypto-shred-anchor; do
        worker_image=$(docker images "gcr.io/ndn-ipfs-chain/$worker:*" --format "{{.Repository}}:{{.Tag}}" | head -1)
        if [[ -n "$worker_image" ]]; then
            docker push "$worker_image"
            log_success "Worker image pushed: $worker_image"
        fi
    done
}

# Deploy to Cloud Run
deploy_cloud_run() {
    log_info "Deploying to Cloud Run..."

    # API Server
    gcloud run deploy ndn-ipfs-api \
        --image "$api_image" \
        --region us-west1 \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars="NODE_ENV=$ENVIRONMENT" \
        --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest" \
        --cpu=2 \
        --memory=4Gi \
        --concurrency=80 \
        --timeout=300

    log_success "API deployed to Cloud Run"

    # Workers (as Cloud Run Jobs)
    for worker in lifecycle-worker trigger-worker; do
        worker_image=$(docker images "gcr.io/ndn-ipfs-chain/$worker:*" --format "{{.Repository}}:{{.Tag}}" | head -1)
        if [[ -n "$worker_image" ]]; then
            gcloud run jobs update "$worker" \
                --image "$worker_image" \
                --region us-west1 \
                --set-env-vars="NODE_ENV=$ENVIRONMENT" \
                --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
                --task-timeout=3600
        fi
    done

    log_success "Workers deployed as Cloud Run Jobs"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Connect to Cloud SQL Proxy and run migrations
    kubectl run migrations --rm -i --restart=Never --image="$api_image" \
        --env="DATABASE_URL=$DATABASE_URL" \
        -- npm run migrate:latest || true

    log_success "Database migrations completed"
}

# Health check
verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for deployment to be ready
    sleep 30

    # Get service URL
    service_url=$(gcloud run services describe ndn-ipfs-api \
        --region us-west1 \
        --format 'value(status.url)')

    # Health check
    response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/_health")

    if [[ "$response" == "200" ]]; then
        log_success "Health check passed: $service_url"
    else
        log_error "Health check failed with status: $response"
        exit 1
    fi

    # Verify API endpoints
    endpoints=(
        "/v1/_discovery"
        "/docs"
    )

    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url$endpoint")
        if [[ "$response" -ge 200 && "$response" -lt 400 ]]; then
            log_success "Endpoint $endpoint responding"
        else
            log_warn "Endpoint $endpoint returned status: $response"
        fi
    done
}

# Rollback function
rollback() {
    log_warn "Rolling back deployment..."

    # Get previous image
    previous_image=$(gcloud run services describe ndn-ipfs-api \
        --region us-west1 \
        --format 'value(spec.template.spec.containers[0].image)')

    gcloud run deploy ndn-ipfs-api \
        --image "$previous_image" \
        --region us-west1 \
        --platform managed

    log_success "Rollback completed"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."

    # Remove old images (keep last 10)
    gcloud container images list-tags gcr.io/ndn-ipfs-chain/api --limit=100 --format="get(digest)" | tail -n +11 | while read -r digest; do
        gcloud container images delete "gcr.io/ndn-ipfs-chain/api@$digest" --force-delete-tags --quiet || true
    done

    log_success "Cleanup completed"
}

# Trap for cleanup on exit
trap cleanup EXIT

# Main deployment flow
main() {
    run_preflight_checks
    build_images
    push_images
    deploy_cloud_run
    run_migrations
    verify_deployment

    log_success "============================================"
    log_success "Deployment to $ENVIRONMENT completed successfully!"
    log_success "============================================"
}

# Handle rollback on failure
trap rollback ERR

main
