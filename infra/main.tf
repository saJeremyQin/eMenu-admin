
# define aws provider
provider "aws" {
    region = "ap-southeast-2"
}

module "networking" {
  source = "./networking"
}

module "ecs" {
    source = "./ecs"
}