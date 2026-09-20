variable "app_name" {
  description = "the name of the app"
  type        = string
  default     = "emenu"
}

variable "repo_name" {
  description = "the name of the repo"
  type        = string
  default     = "emenu-admin"
}

variable "environment" {
  description = "deployment environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnets" {
  description = "Public subnet definitions for the VPC"
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