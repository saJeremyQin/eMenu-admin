
# locals {
#   environment       = "dev"        # 定义 dev 环境的本地变量
#   project_app_name  = "emenu"      # 可以在这里定义，然后传递给模块
#   project_repo_name = "emenu-admin"
# }

module "core_infra" {
  source = "../../modules/core"    # 指向 core 模块的路径

  region      = "ap-southeast-2"
  environment = var.env
 
  app_name  = var.app_name
  repo_name = var.repo_name
}
