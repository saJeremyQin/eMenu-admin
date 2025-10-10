#!/bin/bash
set -e

# ==== Color output ====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ==== Usage ====
# ./deploy.sh dev
# ./deploy.sh prod

ENV="$1"
if [ -z "$ENV" ]; then
  log_error "Usage: $0 <env>"
  echo "Example: $0 dev"
  exit 1
fi

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  log_error "Environment must be 'dev' or 'prod'"
  exit 1
fi

log_info "Starting deployment for $ENV environment..."

# ==== Config ====
REGION="ap-southeast-2"
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null)}

if [ -z "$AWS_ACCOUNT_ID" ]; then
  log_error "Failed to get AWS Account ID. Please check AWS credentials."
  exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Repository and ECS names now include env
ECR_REPOSITORY="emenu/emenu-admin-${ENV}"
ECS_CLUSTER="emenu-admin-${ENV}-cluster"
ECS_SERVICE="emenu-admin-${ENV}-service"

# Use short SHA like in GitHub Actions
IMAGE_TAG=$(git rev-parse --short=10 HEAD)
TAG="latest"

log_info "Configuration:"
echo "  📍 Environment: $ENV"
echo "  🏷️  Image Tag: $IMAGE_TAG"
echo "  📦 Repository: $ECR_REPOSITORY"
echo "  🛳  Cluster: $ECS_CLUSTER"
echo "  ⚙️  Service: $ECS_SERVICE"
echo ""

# ==== Pre-flight checks ====
log_info "Running pre-flight checks..."

# Check if git repo is clean
if [ -n "$(git status --porcelain)" ]; then
  log_warning "Git working directory is not clean. Uncommitted changes detected."
  echo "  Changed files:"
  git status --porcelain | sed 's/^/    /'
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Deployment cancelled."
    exit 0
  fi
fi

# Check if ECR repository exists
log_info "Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$REGION" >/dev/null 2>&1; then
  log_error "ECR repository '$ECR_REPOSITORY' does not exist!"
  log_info "Please create it first or check the repository name."
  exit 1
fi

# Check if ECS cluster exists
log_info "Checking ECS cluster..."
if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$REGION" --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  log_error "ECS cluster '$ECS_CLUSTER' does not exist or is not active!"
  exit 1
fi

log_success "Pre-flight checks passed!"
echo ""

# ==== Build ====
log_info "Building Docker image..."
echo "  🔨 Platform: linux/amd64"
echo "  📦 Tag: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo ""

if ! docker buildx build --platform linux/amd64 -t "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" .; then
  log_error "Docker build failed!"
  exit 1
fi

# Also tag as latest
docker tag "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

log_success "Docker image built successfully!"
echo ""

# ==== Push ====
log_info "Logging in to ECR..."
if ! aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null 2>&1; then
  log_error "ECR login failed!"
  exit 1
fi

log_success "ECR login successful!"

log_info "Pushing Docker images to ECR..."
echo "  📤 Pushing ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
if ! docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"; then
  log_error "Failed to push image with tag: $IMAGE_TAG"
  exit 1
fi

echo "  📤 Pushing ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"
if ! docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"; then
  log_error "Failed to push image with tag: $TAG"
  exit 1
fi

log_success "Images pushed successfully!"
echo ""

# ==== ECS Deployment ====
log_info "Deploying to ECS..."
echo "  🚀 Cluster: $ECS_CLUSTER"
echo "  ⚙️  Service: $ECS_SERVICE"
echo ""

if ! aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${REGION}" >/dev/null; then
  log_error "Failed to trigger ECS deployment!"
  exit 1
fi

log_success "ECS deployment triggered!"

# ==== Wait for deployment ====
log_info "Waiting for deployment to stabilize..."
echo "  ⏳ This may take a few minutes..."

start_time=$(date +%s)
if aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${REGION}" \
  --cli-read-timeout 900 \
  --cli-connect-timeout 60; then
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  log_success "Deployment completed successfully in ${duration}s!"
else
  log_error "Deployment failed or timed out!"
  log_info "Checking service status..."
fi

# ==== Final status ====
log_info "Final deployment status:"
aws ecs describe-services \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${REGION}" \
  --query 'services[0].{TaskDefinition:taskDefinition,RunningCount:runningCount,DesiredCount:desiredCount,Status:status}' \
  --output table

echo ""
log_success "Deployment completed!"
log_info "Images deployed:"
echo "  📦 ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "  📦 ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"