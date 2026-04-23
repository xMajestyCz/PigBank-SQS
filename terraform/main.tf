terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "terraform-state-card-service"
    key            = "payment-sqs-service/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# ← VUELVE el módulo dynamodb
module "dynamodb" {
  source = "./modules/dynamodb"
  stage  = var.stage
}

module "sqs" {
  source = "./modules/sqs"
  stage  = var.stage
}

module "lambdas" {
  source                    = "./modules/lambdas"
  stage                     = var.stage
  account_id                = data.aws_caller_identity.current.account_id
  aws_region                = var.aws_region
  payment_table_name        = module.dynamodb.payment_table_name  # ← viene del módulo
  payment_table_arn         = module.dynamodb.payment_table_arn   # ← viene del módulo
  start_payment_queue_arn   = module.sqs.start_payment_queue_arn
  start_payment_queue_url   = module.sqs.start_payment_queue_url
  check_balance_queue_arn   = module.sqs.check_balance_queue_arn
  check_balance_queue_url   = module.sqs.check_balance_queue_url
  transaction_queue_arn     = module.sqs.transaction_queue_arn
  transaction_queue_url     = module.sqs.transaction_queue_url
  card_service_url          = var.card_service_url
  lambda_s3_bucket          = var.lambda_s3_bucket
  vpc_subnet_ids            = var.vpc_subnet_ids
  vpc_security_group_ids    = var.vpc_security_group_ids
}