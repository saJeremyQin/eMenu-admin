
variable "environment" {
  description = "The name of the deployment environement, dev, prod..."
  default     = "dev"
  type        = string
}

variable "region" {
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

variable "vpc_cidr" {
  description = "CIDR block for the shared VPC."
  type        = string
}

variable "public_subnets" {
  description = "Public subnet definitions for the shared VPC."
  type = list(object({
    name              = string
    cidr_block        = string
    availability_zone = string
  }))

  validation {
    condition     = length(var.public_subnets) == 2 && contains([for subnet in var.public_subnets : subnet.name], "public-a") && contains([for subnet in var.public_subnets : subnet.name], "public-b")
    error_message = "public_subnets must contain exactly two entries named public-a and public-b."
  }
}