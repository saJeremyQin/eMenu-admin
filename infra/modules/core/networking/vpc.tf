
locals {
  resource_prefix = "${var.repo_name}-${var.environment}"
  public_subnets_by_name = {
    for subnet in var.public_subnets : subnet.name => subnet
  }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr //65536 ips
  enable_dns_hostnames = true

  tags = {
    Name = "${local.resource_prefix}-vpc"
  }
}

// Provides a resource to create a VPC Internet Gateway
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${local.resource_prefix}-igw" //connect to Internet, inbound and outbound
  }
}

resource "aws_subnet" "public" {
  for_each          = local.public_subnets_by_name
  vpc_id            = aws_vpc.this.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone

  // Instances launched into the subnet should be assigned a public IP address. Why?
  map_public_ip_on_launch = true
  tags = {
    Name = "${local.resource_prefix}-${each.key}"
  }
}

// Create route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags = {
    Name = "${local.resource_prefix}-public-rt"
  }
}

// attach Internet route
resource "aws_route" "internet_access" {
  route_table_id         = aws_route_table.public.id    //this route is added to the above route table
  destination_cidr_block = "0.0.0.0/0"                  //all the outbound traffic
  gateway_id             = aws_internet_gateway.this.id //allow all the outbound traffic to the IGW, make them access internet
}

// associate route table to subnet
resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id //only after association, the subnet can access to Internet
  route_table_id = aws_route_table.public.id
}