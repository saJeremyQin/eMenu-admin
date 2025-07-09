variable "aws_region" {
    default = "ap-southeast-2"
}

variable "app_name" {
    description = "the name of the app"
    type = string
    default = "emenu"
}

variable "repo_name" {
    description = "the name of the repo"
    type = string
    default = "emenu-admin"
}