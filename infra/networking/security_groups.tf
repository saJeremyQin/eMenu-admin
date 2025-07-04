resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.this.id
  tags = {
    Name = "alb-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http_inbound" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTP from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  
  from_port   = 80
  ip_protocol = "tcp"
  to_port     = 80
}


resource "aws_vpc_security_group_ingress_rule" "alb_https_inbound" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTPS from anywhere"
  cidr_ipv4         = "0.0.0.0/0"
  
  from_port   = 443
  ip_protocol = "tcp"
  to_port     = 443
}

// allow all the outbound traffic (ALB need access to ECS)
resource "aws_vpc_security_group_outgress_rule" "alb_outbound_all" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound traffic"

  cidr_ipv4   = "0.0.0.0/0"
  from_port   = 0
  ip_protocol = "-1"
  to_port     = 0
}

resource "aws_security_group" "fargate" {
  name        = "fargate-sg"
  description = "Security group for fargate"
  vpc_id      = aws_vpc.this.id

  tags = {
    Name = "fargate-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "fargate_from_alb" {
  security_group_id = aws_security_group.fargate.id
  description       = "Allow HTTP from ALB"
    
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"

  referenced_security_group_id = aws_security_group.alb.id
}

// all outbound traffic, ECR, AppSync, CloudWatch
resource "aws_vpc_security_group_egress_rule" "fargate_outbound_all" {
  security_group_id = aws_security_group.fargate.id
  description       = "Allow all traffic outbound"
    
  from_port         = 0
  to_port           = 0
  ip_protocol       = "-1"

  cidr_ipv4 = "0.0.0.0/0"

}