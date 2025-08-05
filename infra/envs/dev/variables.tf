
variable "env" {
  description = "The name of the deployment environement, dev, prod..."
  default = "dev"
  type = string
}

variable "app_name" {
  default = "emenu"
  type    = string
}

variable "repo_name" {
  default = "emenu-admin"
  type    = string
}

variable "ecs_container_port" {
  default = 80
  type    = number
}