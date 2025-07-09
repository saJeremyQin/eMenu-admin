    # infra/core/outputs.tf

    output "vpc_id" {
      description = "The ID of the main VPC."
      value       = module.networking.vpc_id
    }

    output "public_subnet_a_id" {
      description = "List of public subnet IDs."
      value       = module.networking.public_subnet_a_id
    }

    output "ublic_subnet_b_id" {
      description = "List of public subnet IDs."
      value       = module.networking.public_subnet_b_id
    }

    output "public_subnet_ids" { 
      description = "List of public subnet IDs."
      value       = module.networking.public_subnet_ids
    }

    output "alb_security_group_id" {
      description = "The ID of the ALB security group."
      value       = module.networking.alb_security_group_id
    }

    output "fargate_security_group_id" {
      description = "The ID of the Fargate task security group."
      value       = module.networking.fargate_security_group_id
    }

    output "ecr_repository_url" {
      description = "The URL of the ECR repository."
      value       = module.ecr.repository_url
    }

    output "ecr_repository_name" {
      description = "The name of the ECR repository."
      value       = module.ecr.repository_name
    }
    
    output "ecr_repository_arn" {
      description = "The ARN of the ECR repository."
      value       = module.ecr.repository_arn    
    }