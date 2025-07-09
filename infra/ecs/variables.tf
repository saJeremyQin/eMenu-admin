
variable "alb_sg_id" {
  description = "The ID of security group for the ALB"
}

variable "fargate_sg_id" {
  description = "The ID of security group for the farget service"
}

variable "subnet_public_a_id" {
  description = "Subnet A ID"
}

variable "subnet_public_b_id" {
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