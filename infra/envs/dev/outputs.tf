
# Key info about core module, will be used by plaform module
output "vpc_id" {
  description = "The ID of the main VPC for dev environment."
  value       = module.core_infra.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for dev environment."
  value       = module.core_infra.public_subnet_ids
}

output "alb_security_group_id" {
  description = "The ID of the ALB security group for dev environment."
  value       = module.core_infra.alb_security_group_id
}

output "fargate_security_group_id" {
  description = "The ID of the Fargate task security group for dev environment."
  value       = module.core_infra.fargate_security_group_id
}

output "public_subnet_a_id" {
  value = module.core_infra.public_subnet_a_id 
}

output "public_subnet_b_id" {
  value = module.core_infra.public_subnet_b_id
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for dev environment."
  value       = module.core_infra.ecr_repository_url
}

output "ecr_repository_name" {
  description = "The name of the ECR repository for dev environment."
  value       = module.core_infra.ecr_repository_name
}

output "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  value       = module.core_infra.cognito_identity_pool_id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster for dev environment."
  value       = module.platform_infra.ecs_cluster_name
}

output "ecs_service_name" {
  description = "The name of the ECS service for dev environment."
  value       = module.platform_infra.ecs_service_name
}

output "alb_dns_name" {
  description = "The dns name of alb, accessible if success"
  value = module.platform_infra.alb_dns_name
}

# ECR Registry URL parameter for container deployment
resource "aws_ssm_parameter" "ssm_ecr_registry_url" {
  description = "ECR Registry URL for ${var.env} environment"
  name        = "/${var.repo_name}/${var.env}/ecr_registry_url"
  value       = module.core_infra.ecr_repository_url
  type        = "String"
  overwrite   = true  
}
