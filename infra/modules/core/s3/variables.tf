variable "environment" {
  description = "Environment name (dev, prod, etc.)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID for authenticated user access"
  type        = string
  default     = ""
}