

output "ecs_alb_dns_name" {
  description = "The dns name of alb, accessible if success"
  value = module.ecs.alb_dns_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_task_definition_arn" {
  value = module.ecs.task_definition_arn
}
