# Outputs from networking/vpc.tf

output "vpc_id" {
  description = "The ID of the main VPC."
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the main VPC."
  value       = aws_vpc.this.cidr_block
}

output "internet_gateway_id" {
  description = "The ID of the Internet Gateway."
  value       = aws_internet_gateway.this.id
}

output "public_subnet_a_id" {
  description = "The ID of public subnet A."
  value       = aws_subnet.public_a.id
}

output "public_subnet_b_id" {
  description = "The ID of public subnet B."
  value       = aws_subnet.public_b.id
}

output "public_subnet_ids" {
  description = "A list of public subnet IDs."
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "public_route_table_id" {
  description = "The ID of the public route table."
  value       = aws_route_table.public.id
}

# Outputs from networking/security_groups.tf

output "alb_security_group_id" {
  description = "The ID of the ALB security group."
  value       = aws_security_group.alb.id
}

output "fargate_security_group_id" {
  description = "The ID of the Fargate task security group."
  value       = aws_security_group.fargate.id
}