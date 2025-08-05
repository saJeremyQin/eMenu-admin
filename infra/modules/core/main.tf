
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