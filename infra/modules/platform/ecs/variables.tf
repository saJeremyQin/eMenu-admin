
variable "alb_sg_id" {
  description = "The ID of security group for the ALB"
}

variable "fargate_sg_id" {
  description = "The ID of security group for the farget service"
}

variable "public_subnet_a_id" {
  description = "Subnet A ID"
}

variable "public_subnet_b_id" {
  description = "Subnet B ID"
}

variable "vpc_id" {
  description = "VPC ID for the ECS service"
}

variable "service_name" {
  
}

variable "container_image" {
  
}

variable "container_port" {
  
}

variable "env" {
  
}

variable "app_name" {
  
}

variable "repo_name" {
  
}

variable "presigned_url_generator" {
  description = "Presigned URL Generator Lambda URL from eMenu-backend"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for restaurant assets from eMenu-backend"
  type        = string
}

variable "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  type        = string
}