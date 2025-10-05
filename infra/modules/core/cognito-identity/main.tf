# Cognito Identity Pool for S3 access
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "emenu_identity_pool_${var.environment}"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = var.cognito_user_pool_client_id
    provider_name           = var.cognito_user_pool_provider_name
    server_side_token_check = false
  }

  tags = {
    Name        = "eMenu Identity Pool"
    Environment = var.environment
  }
}

# IAM role for authenticated users
resource "aws_iam_role" "authenticated" {
  name = "emenu_cognito_authenticated_${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "eMenu Cognito Authenticated Role"
    Environment = var.environment
  }
}

# IAM policy for S3 access with user-specific isolation
resource "aws_iam_role_policy" "authenticated_s3_policy" {
  name = "emenu_s3_access_${var.environment}"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.s3_bucket_arn}/public/restaurant-logos/$${cognito-identity.amazonaws.com:sub}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "public/restaurant-logos/$${cognito-identity.amazonaws.com:sub}/*"
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${var.s3_bucket_arn}/public/restaurant-logos/*/processed/*"
        ]
      }
    ]
  })
}

# Attach role to identity pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.authenticated.arn
  }
}