variable "environment" {
  description = "Environment name (dev, prod, etc.)"
  type        = string
}

variable "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  type        = string
}

variable "cognito_user_pool_provider_name" {
  description = "Cognito User Pool Provider Name (format: cognito-idp.region.amazonaws.com/user_pool_id)"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN for restaurant assets"
  type        = string
}