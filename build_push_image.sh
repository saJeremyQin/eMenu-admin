#!/bin/bash
set -e

# ==== Config ====
REGION="ap-southeast-2"
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.$REGION.amazonaws.com"
ECR_REPOSITORY="emenu/emenu-admin"
IMAGE_TAG=$(git rev-parse HEAD)  # full commit SHA
TAG="latest"

# ==== Build ====
echo "🧱 Building Docker image..."
docker buildx build --platform linux/amd64 -t "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"  .

# latest tag
docker tag "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

# ==== Push ====
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "📤 Pushing Docker image to ECR..."
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" 
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"


echo "✅ Done! Image pushed:"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"

# ==== ECS Redeploy ====
aws ecs update-service --cluster emenu-admin-cluster --service emenu-admin-service --force-new-deployment  --region "${REGION}"
