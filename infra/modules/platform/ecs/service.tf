# Define ECS service, deploy task definition to cluster, and attach to ALB
resource "aws_ecs_service" "this" {
  name            = "${var.repo_name}-${var.env}-service"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn

  desired_count = 1
  launch_type   = "FARGATE"

  network_configuration {
    subnets          = [ var.public_subnet_a_id, var.public_subnet_b_id ]
    security_groups  = [ var.fargate_sg_id]
    assign_public_ip = true 
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.this.arn
    container_name = "${var.repo_name}-${var.env}"
    container_port = 80
  }
  depends_on = [ aws_alb_listener.this ]
}