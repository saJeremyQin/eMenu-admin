terraform {
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.region
}

module "core_infra" {
  source = "./modules/core"

  region         = var.region
  environment    = var.environment
  app_name       = var.app_name
  repo_name      = var.repo_name
  vpc_cidr       = var.vpc_cidr
  public_subnets = var.public_subnets
}

module "platform_infra" {
  source = "./modules/platform"

  app_name    = var.app_name
  repo_name   = var.repo_name
  environment = var.environment

  container_image = "${module.core_infra.ecr_repository_url}:latest"
  container_port  = var.ecs_container_port

  presigned_url_generator_url = module.core_infra.backend_presigned_url_generator
  restaurant_assets_bucket    = module.core_infra.backend_s3_bucket_name
  dish_images_bucket          = module.core_infra.backend_dish_images_bucket_name

  vpc_id        = module.core_infra.vpc_id
  alb_sg_id     = module.core_infra.alb_security_group_id
  fargate_sg_id = module.core_infra.fargate_security_group_id

  public_subnet_a_id = module.core_infra.public_subnet_a_id
  public_subnet_b_id = module.core_infra.public_subnet_b_id
}