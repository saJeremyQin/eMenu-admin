output "s3_bucket_name" {
  description = "Name of the S3 bucket for restaurant assets"
  value       = aws_s3_bucket.restaurant_assets.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for restaurant assets"
  value       = aws_s3_bucket.restaurant_assets.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.restaurant_assets.bucket_domain_name
}

output "lambda_function_arn" {
  description = "ARN of the image processor Lambda function"
  value       = aws_lambda_function.image_processor.arn
}