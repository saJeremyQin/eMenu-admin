
// Backend config is selected per environment via -backend-config=backend-<env>.hcl
terraform {
  backend "s3" {}
}