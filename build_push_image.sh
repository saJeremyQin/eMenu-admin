#!/bin/bash
set -e

REGION="ap-southeast-2"
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.$REGION.amazonaws.com"
ECR_REPOSITORY="emenu/emenu-admin"
TAG="latest"

# Get the commit SHA（12 digits，the same with GitHub Actions）
IMAGE_TAG=$(git rev-parse --short=12 HEAD)

echo "🧱 Building Docker image..."
docker build -t "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"  .

# latest tag
docker tag "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"

echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "📤 Pushing Docker image to ECR..."
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}" 
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"


echo "✅ Done! Image pushed:"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "    - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG}"