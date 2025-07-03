
resource "aws_ecs_cluster" "main_cluster" {
    name = 1
}

output "ecs_cluster_name" {
  value = 1
}