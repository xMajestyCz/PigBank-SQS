variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "stage" {
  type    = string
  default = "dev"
}

variable "card_service_url" {
  description = "Base URL of the card-service API Gateway"
  type        = string
}

variable "redis_host" {
  description = "Redis cluster host"
  type        = string
}

variable "redis_port" {
  description = "Redis cluster port"
  type        = string
  default     = "6379"
}

variable "lambda_s3_bucket" {
  description = "S3 bucket where lambda zips are uploaded"
  type        = string
}