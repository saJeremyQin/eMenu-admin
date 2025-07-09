
resource "aws_ecr_repository" "this" {
  name = "${var.app_name}/${var.repo_name}"
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = var.repo_name
  }
}