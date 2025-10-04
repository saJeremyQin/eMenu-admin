# S3 bucket for restaurant assets
resource "aws_s3_bucket" "restaurant_assets" {
  bucket = "emenu-restaurant-assets-${var.environment}"

  tags = {
    Name        = "Restaurant Assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "restaurant_assets_versioning" {
  bucket = aws_s3_bucket.restaurant_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "restaurant_assets_encryption" {
  bucket = aws_s3_bucket.restaurant_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "restaurant_assets_cors" {
  bucket = aws_s3_bucket.restaurant_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "restaurant_assets_pab" {
  bucket = aws_s3_bucket.restaurant_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "restaurant_assets_policy" {
  bucket = aws_s3_bucket.restaurant_assets.id
  depends_on = [aws_s3_bucket_public_access_block.restaurant_assets_pab]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.restaurant_assets.arn}/*"
      },
      {
        Sid    = "AuthenticatedUserUpload"
        Effect = "Allow"
        Principal = "*"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.restaurant_assets.arn}/restaurant-logos/*"
      }
    ]
  })
}

# Lambda function for image processing
resource "aws_iam_role" "image_processor_role" {
  name = "image-processor-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "image_processor_policy" {
  name = "image-processor-policy-${var.environment}"
  role = aws_iam_role.image_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.restaurant_assets.arn}/*"
      }
    ]
  })
}

resource "aws_lambda_function" "image_processor" {
  filename         = "${path.module}/image_processor.zip"
  function_name    = "restaurant-image-processor-${var.environment}"
  role            = aws_iam_role.image_processor_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 60
  memory_size      = 512
  source_code_hash = filebase64sha256("${path.module}/image_processor.zip")

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.restaurant_assets.bucket
    }
  }

  depends_on = [aws_iam_role_policy.image_processor_policy]
}

resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.restaurant_assets.arn
}

resource "aws_s3_bucket_notification" "image_upload_notification" {
  bucket = aws_s3_bucket.restaurant_assets.id

  # Handle public path uploads (Amplify default)
  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "public/restaurant-logos/raw/"
  }

  # Handle direct path uploads (fallback)
  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "restaurant-logos/raw/"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# Store bucket name in SSM for application access
resource "aws_ssm_parameter" "s3_bucket_name" {
  name        = "/emenu-admin/${var.environment}/s3_bucket_name"
  description = "S3 Bucket name for restaurant assets"
  type        = "String"
  value       = aws_s3_bucket.restaurant_assets.bucket
  overwrite   = true

  tags = {
    Environment = var.environment
  }
}