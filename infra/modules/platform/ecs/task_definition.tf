# define ECS task definition, including container image, port mappling, CPU/Memory
resource "aws_ecs_task_definition" "this" {
  family                   = "${var.service_name}-${var.env}" 
  requires_compatibilities = [ "FARGATE" ]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "${var.service_name}-${var.env}" 
      image = var.container_image   
      portMappings = [
        {
          containerPort = var.container_port
        }
      ],
      environment = [
        {
          name  = "VITE_PRESIGNED_URL_GENERATOR"
          value = var.presigned_url_generator
        },
        {
          name  = "VITE_S3_BUCKET_NAME"
          value = var.s3_bucket_name
        },
        {
          name  = "VITE_COGNITO_IDENTITY_POOL_ID"
          value = var.cognito_identity_pool_id
        }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_task_logs.name
          awslogs-region        = "ap-southeast-2"
          awslogs-stream-prefix = "${var.repo_name}-${var.env}"
        }
      }
    }
  ])
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "emenu-admin-task-exectuion-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
        Effect = "Allow",
        Principal = {
            Service = "ecs-tasks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
    role = aws_iam_role.ecs_task_execution_role.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_cloudwatch_log_group" "ecs_task_logs" {
  name = "ecs/${var.repo_name}-${var.env}" # Must match your task definition
  retention_in_days = 7 # Or your desired retention
}