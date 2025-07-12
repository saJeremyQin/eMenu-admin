
// Define ECS cluster resource
resource "aws_ecs_cluster" "this" {
  name = "emenu-admin-cluster"

  tags = {
    Name = "emenu-admin-cluster"
    Project = "emenu-admin"
    Service = "emenu-admin-service"
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