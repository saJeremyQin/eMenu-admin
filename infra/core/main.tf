
module "networking" {
  source    = "./networking"
  app_name  = var.app_name
  repo_name = var.repo_name
}

module "ecr" {
  source    = "./ecr"
  app_name  = var.app_name
  repo_name = var.repo_name
}