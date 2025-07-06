
output "alb_sg_id" {
    value = aws_security_group.alb.id 
}

output "fargate_sg_id" {
    value = aws_security_group.fargate.id
}

output "subnet_public_a_id" {
    value = aws_subnet.public_a.id
}

output "subnet_public_b_id" {
    value = aws_subnet.public_b.id
}

output "vpc_id" {
    value = aws_vpc.this.id
}
