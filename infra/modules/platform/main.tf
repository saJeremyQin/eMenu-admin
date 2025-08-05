
# data "terraform_remote_state" "core" {
#   backend = "s3"
#   config = {
#     bucket       = "emenu-terraform-state-bucket"
#     key          = "emenu_admin/core/terraform.tfstate"
#     region       = "ap-southeast-2"
#   }
# }

# variable "service_name" {
#   type = string
# }

variable "container_image" {
  type = string  
}

variable "container_port" {
  type = number
}

variable "vpc_id" {
  type = string
}

variable "alb_sg_id" {
  type = string
}

variable "fargate_sg_id" {
  type = string
}

variable "public_subnet_a_id" {
  type = string
}

variable "public_subnet_b_id" {
  type = string
}

variable "environment" {
  
}
variable "app_name" {
  
}

variable "repo_name" {
  
}


module "ecs" {
  source          = "./ecs"
  app_name        = var.app_name
  repo_name       = var.repo_name
  service_name    = var.repo_name

  container_image = var.container_image
  container_port  = var.container_port

  vpc_id        = var.vpc_id
  alb_sg_id     = var.alb_sg_id
  fargate_sg_id = var.fargate_sg_id

  public_subnet_a_id =  var.public_subnet_a_id 
  public_subnet_b_id =  var.public_subnet_b_id

  env = var.environment
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "alb_dns_name" {
  description = "The dns name of alb, accessible if success"
  value = module.ecs.alb_dns_name
}

output "ecs_service_name" {
  description = "The service name of ecs"
  value = module.ecs.service_name
}