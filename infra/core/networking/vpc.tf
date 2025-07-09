
resource "aws_vpc" "this" {
  cidr_block           = "10.0.0.0/16"                      //65536 ips
  enable_dns_hostnames = true

  tags =  {
    Name ="${var.repo_name}-vpc"
  }
}

// Provides a resource to create a VPC Internet Gateway
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.repo_name}-igw"                           //connect to Internet, inbound and outbound
  } 
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-southeast-2a"

  // Instances launched into the subnet should be assigned a public IP address. Why?
  map_public_ip_on_launch = true             
  tags = {
    Name = "${var.repo_name}public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.this.id
  cidr_block        = "10.0.2.0/24"                         //255
  availability_zone = "ap-southeast-2b"

  // Instances launched into the subnet should be assigned a public IP address. Why?
  map_public_ip_on_launch = true             
  tags = {
    Name = "${var.repo_name}-public-b"
  }
}

// Create route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags = {
    Name = "${var.repo_name}-rt"
  }
}

// attach Internet route
resource "aws_route" "internet_access" {
  route_table_id         = aws_route_table.public.id         //this route is added to the above route table
  destination_cidr_block = "0.0.0.0/0"                       //all the outbound traffic
  gateway_id             = aws_internet_gateway.this.id      //allow all the outbound traffic to the IGW, make them access internet
}

// associate route table to subnet
resource "aws_route_table_association" "public_a" {
  subnet_id = aws_subnet.public_a.id                         //only after association, the subnet can access to Internet
  route_table_id = aws_route_table.public.id
}