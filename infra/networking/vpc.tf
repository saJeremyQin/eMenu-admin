
resource "aws_vpc" "main_vpc" {
  
}

resource "aws_internet_gateway" "main_igw" {
  
}

resource "aws_subnet" "public_subnet" {
    vpc_id = aws_vpc.main_vpc.id
}

resource "aws_subnet" "private_subnet" {
    vpc_id = aws_vpc.main_vpc.id
}

# output for use by other modules
output "vpc_id" {
  value = aws_vpc.main_vpc.id
}

output "public_subnet_ids" {
  value = aws_subnet.public_subnet.*.id
}

output "private_subnet_ids" {
  value = aws_subnet.private_subnet.*.id
}
