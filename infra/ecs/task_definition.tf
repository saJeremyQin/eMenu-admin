# define ECS task definition, including container image, port mappling, CPU/Memory
resource "aws_ecs_task_definition" "emenu" {
  family                   = "emenu-admin"
  requires_compatibilities = [ "FARGATE" ]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "emenu-admin"
      image     = "205930647566.dkr.ecr.ap-southeast-2.amazonaws.com/emenu/emenu-admin:latest"
     
      portMappings = [
        {
          containerPort = 80
        }
      ]
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