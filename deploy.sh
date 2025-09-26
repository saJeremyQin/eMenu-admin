#!/bin/bash
set -e

# ==== Usage ====
# ./deploy.sh dev
# ./deploy.sh prod

ENV="$1"
if [ -z "$ENV" ]; then
  echo "❌ Usage: $0 <env>"
  echo "Example: $0 dev"
  exit 1
fi

# ==== Config ====
REGION="ap-southeast-2"
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Repository and ECS names now include env
ECR_REPOSITORY="emenu/emenu-admin-${ENV}"
ECS_CLUSTER="emenu-admin-${ENV}-cluster"
ECS_SERVICE="emenu-admin-${ENV}-service"

IMAGE_TAG=$(git rev-parse HEAD)  # full commit SHA
TAG="latest"

echo "⚙️ ENV=${ENV}"
echo "📦 Repository=${ECR_REPOSITORY}"
echo "🛳  Cluster=${ECS_CLUSTER}, Service=${ECS_SERVICE}"

# ==== Build ====
echo "🧱 Building Docker image..."
docker buildx build --platform linux/amd64 -t "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" .

# also tag as latest
docker tag "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

# ==== Push ====
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "📤 Pushing Docker image to ECR..."
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

echo "✅ Done! Image pushed:"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

# ==== ECS Redeploy ====
echo "🚀 Forcing new deployment on ECS..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${REGION}"