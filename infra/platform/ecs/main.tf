
//      image     = "205930647566.dkr.ecr.ap-southeast-2.amazonaws.com/emenu/emenu-admin:latest"

# define aws provider
provider "aws" {
    region = "ap-southeast-2"
}

module "networking" {
  source = "./networking"
}

module "ecr" {
  source = "./ecr"
  name = "emenu"
}

module "ecs" {
    source          = "./ecs"
    service_name    = "emenu-admin"
    container_image = "${module.ecr.repository_url}:latest"
    container_port  = 80

    vpc_id = module.networking.vpc_id
    alb_sg_id = module.networking.alb_sg_id
    fargate_sg_id = module.networking.fargate_sg_id

    subnet_public_a_id = module.networking.subnet_public_a_id
    subnet_public_b_id = module.networking.subnet_public_b_id
}