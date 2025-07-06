
# define aws provider
provider "aws" {
    region = "ap-southeast-2"
}

module "networking" {
  source = "./networking"
}

module "ecs" {
    source = "./ecs"

    vpc_id = module.networking.vpc_id
    alb_sg_id = module.networking.alb_sg_id
    fargate_sg_id = module.networking.fargate_sg_id

    subnet_public_a_id = module.networking.subnet_public_a_id
    subnet_public_b_id = module.networking.subnet_public_b_id
}