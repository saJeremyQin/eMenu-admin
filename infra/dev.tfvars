environment        = "dev"
region             = "ap-southeast-2"
app_name           = "emenu"
repo_name          = "emenu-admin"
ecs_container_port = 80
vpc_cidr           = "10.0.0.0/16"
public_subnets = [
  {
    name              = "public-a"
    cidr_block        = "10.0.1.0/24"
    availability_zone = "ap-southeast-2a"
  },
  {
    name              = "public-b"
    cidr_block        = "10.0.2.0/24"
    availability_zone = "ap-southeast-2b"
  }
]