
module "platform_infra" {
  source = "../../modules/platform"    # 指向 core 模块的路径

  app_name     = var.app_name
  repo_name    = var.repo_name
#   service_name = var.repo_name
  environment  = var.env

  container_image = "${module.core_infra.ecr_repository_url}:latest"
  container_port  = var.ecs_container_port

  vpc_id = module.core_infra.vpc_id
  alb_sg_id = module.core_infra.alb_security_group_id
  fargate_sg_id = module.core_infra.fargate_security_group_id

  subnet_public_a_id = module.core_infra.public_subnet_a_id
  subnet_public_b_id = module.core_infra.public_subnet_b_id
}
