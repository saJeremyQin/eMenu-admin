
// Define ECS cluster resource
resource "aws_ecs_cluster" "this" {
  name = "${var.repo_name}-${var.environment}-cluster"

  tags = {
    Name    = "${var.repo_name}-${var.environment}-cluster"
    Project = "${var.repo_name}-${var.environment}-project"
    Service = "${var.repo_name}-${var.environment}-service"
  }
}

# output "ecs_cluster_name" {
#   description = "the name of the ECS cluster"
#   value = aws_ecs_cluster.this.name
# }

# output "ecs_cluster_arn" {
#   description = "the ARN of the ECS cluster"
#   value = aws_ecs_cluster.this.arn
# }