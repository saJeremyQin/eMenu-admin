
data "terraform_remote_state" "core" {
  backend = "s3"
  config = {
    bucket       = "emenu-terraform-state-bucket"
    key          = "emenu_admin/core/terraform.tfstate"
    region       = "ap-southeast-2"
  }
}

module "ecs" {
  source          = "./ecs"
  service_name    = "emenu-admin"
  container_image = "${data.terraform_remote_state.core.outputs.ecr_repository_url}:latest"
  container_port  = 80

  vpc_id = data.terraform_remote_state.core.outputs.vpc_id
  alb_sg_id = data.terraform_remote_state.core.outputs.alb_security_group_id
  fargate_sg_id = data.terraform_remote_state.core.outputs.fargate_security_group_id

  subnet_public_a_id = data.terraform_remote_state.core.outputs.public_subnet_a_id
  subnet_public_b_id = data.terraform_remote_state.core.outputs.public_subnet_b_id
}