
output "alb_dns_name" {
  description = "The dns name of alb, accessible if success"
  value = aws_alb.this.dns_name
}

output "service_name" {
  value = aws_ecs_service.this.name
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.this.arn
}
