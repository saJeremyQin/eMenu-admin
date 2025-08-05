# Define ALB, Target Group and listener
resource "aws_alb" "this" {
    name               = "${var.repo_name}-${var.env}-alb"
    internal           = false
    load_balancer_type = "application"
    security_groups    = [ var.alb_sg_id ]
    subnets = [ 
        var.public_subnet_a_id,
        var.public_subnet_b_id
    ]
}

resource "aws_alb_target_group" "this" {
    name        = "${var.repo_name}-${var.env}-tg"
    port        = 80
    protocol    = "HTTP"
    vpc_id      = var.vpc_id
    target_type = "ip"
}

resource "aws_alb_listener" "this" {
    load_balancer_arn = aws_alb.this.arn
    port              = 80
    protocol          = "HTTP"

    default_action {
      type             = "forward"
      target_group_arn = aws_alb_target_group.this.arn
    }
}