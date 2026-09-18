
resource "aws_ecr_repository" "this" {
  name = "${var.app_name}/${var.repo_name}-${var.environment}"
  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
  tags = {
    Name = "${var.repo_name}-${var.environment}"
  }
}