
variable "environment" {
  description = "The deployment environment (e.g., dev, prod)."
  type        = string
}

variable "region" {
  description = "The region my app runs in"
  type        = string
}

variable "app_name" {
  default = "emenu"
  type    = string
}

variable "repo_name" {
  default = "emenu-admin"
  type    = string 
}

module "networking" {
  source     = "./networking"
  app_name   = var.app_name
  repo_name  = var.repo_name
  aws_region = var.region
}

module "ecr" {
  source     = "./ecr"
  app_name   = var.app_name
  repo_name  = var.repo_name
  env        = var.environment
  aws_region = var.region
}

# S3 和 Lambda 资源已迁移到 eMenu-backend 项目
# module "s3" 已移除

# Cognito Identity Pool 暂时保留（可能还需要用于其他功能）
module "cognito_identity" {
  source                          = "./cognito-identity"
  environment                     = var.environment
  cognito_user_pool_client_id     = "4l90vqi7nfam318ci1tml91j3n"
  cognito_user_pool_provider_name = "cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_Mw4J3zNoQ"
}

# =====================================
# Backend Integration (Remote State)
# =====================================

# 读取 eMenu-backend 的 remote state
data "terraform_remote_state" "backend" {
  backend = "s3"
  config = {
    bucket = "emenu-terraform-state-bucket"
    key    = "emenu_backend/dev/terraform.tfstate"  # eMenu-backend 项目的 state 路径
    region = "ap-southeast-2"
  }
}

# 从 eMenu-backend 获取配置
locals {
  backend_config = {
    presigned_url_generator_url = data.terraform_remote_state.backend.outputs.presigned_url_generator_url
    restaurant_assets_bucket    = data.terraform_remote_state.backend.outputs.restaurant_assets_bucket_name
  }
}

# outputs
# 暴露 networking 模块的输出作为 core 模块的输出
output "vpc_id" {
  description = "The ID of the VPC created by the core module."
  value       = module.networking.vpc_id # 引用 core 模块内部的 networking 子模块的输出
}

output "public_subnet_ids" {
  description = "List of public subnet IDs created by the core module."
  value       = module.networking.public_subnet_ids
}

output "public_subnet_a_id" {
  description = "Public subnet A ID created by the core module."
  value       = module.networking.public_subnet_a_id
}

output "public_subnet_b_id" {
  description = "Public subnet B ID created by the core module."
  value       = module.networking.public_subnet_b_id
}

output "alb_security_group_id" {
  description = "The ID of the ALB security group created by the core module."
  value       = module.networking.alb_security_group_id
}

output "fargate_security_group_id" {
  description = "The ID of the Fargate security group created by the core module."
  value       = module.networking.fargate_security_group_id
}

# 暴露 ecr 模块的输出作为 core 模块的输出
output "ecr_repository_url" {
  description = "The URL of the ECR repository created by the core module."
  value       = module.ecr.repository_url # 引用 core 模块内部的 ecr 子模块的输出
}

output "ecr_repository_name" {
  description = "The name of the ECR repository created by the core module."
  value       = module.ecr.repository_name
}

# S3 输出已移除，因为 S3 资源已迁移到 eMenu-backend
# output "s3_bucket_name" 已移除
# output "s3_bucket_arn" 已移除  
# output "s3_bucket_domain_name" 已移除

# 暴露 cognito-identity 模块的输出作为 core 模块的输出
output "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  value       = module.cognito_identity.identity_pool_id
}

# 暴露从 eMenu-backend 获取的配置
output "backend_presigned_url_generator" {
  description = "Presigned URL Generator Lambda URL from eMenu-backend"
  value       = local.backend_config.presigned_url_generator_url
}

output "backend_s3_bucket_name" {
  description = "S3 bucket name from eMenu-backend"
  value       = local.backend_config.restaurant_assets_bucket
}