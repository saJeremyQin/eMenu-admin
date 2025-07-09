variable "aws_region" {
  default = "ap-southeast-2"
}

variable "app_name" {
  description = "the name of app, from upper level"
  type = string
}

variable "repo_name" {
  description = "the name of repo, from upper level"
  type = string
}