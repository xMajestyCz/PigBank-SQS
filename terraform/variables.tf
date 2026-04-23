variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "stage" {
  type    = string
  default = "dev"
}

variable "card_service_url" {
  type = string
}

variable "lambda_s3_bucket" {
  type = string
}

variable "vpc_subnet_ids" {
  type = list(string)
}

variable "vpc_security_group_ids" {
  type = list(string)
}