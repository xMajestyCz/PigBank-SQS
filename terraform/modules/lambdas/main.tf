resource "aws_iam_role" "lambda_role" {
  name = "payment-sqs-lambda-role-${var.stage}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "payment-sqs-lambda-policy-${var.stage}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/${var.payment_table_name}",
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/card-table-dev",
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/card-table-dev/index/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [
          var.start_payment_queue_arn,
          var.check_balance_queue_arn,
          var.transaction_queue_arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = [
          var.check_balance_queue_arn,
          var.transaction_queue_arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${var.lambda_s3_bucket}/*"
      }
    ]
  })
}

locals {
  shared_env = {
    PAYMENT_TABLE_NAME                  = var.payment_table_name
    CARD_TABLE_NAME                     = "card-table-dev"
    CHECK_BALANCE_QUEUE_URL             = var.check_balance_queue_url
    TRANSACTION_QUEUE_URL               = var.transaction_queue_url
    CARD_SERVICE_URL                    = var.card_service_url
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
  }
}

resource "aws_lambda_function" "start_payment" {
  function_name = "start-payment-lambda-${var.stage}"
  s3_bucket     = var.lambda_s3_bucket
  s3_key        = "lambdas/start-payment.zip"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  environment { variables = local.shared_env }
}

resource "aws_lambda_function" "check_balance" {
  function_name = "check-balance-lambda-${var.stage}"
  s3_bucket     = var.lambda_s3_bucket
  s3_key        = "lambdas/check-balance.zip"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  environment { variables = local.shared_env }
}

resource "aws_lambda_function" "transaction" {
  function_name = "transaction-lambda-${var.stage}"
  s3_bucket     = var.lambda_s3_bucket
  s3_key        = "lambdas/transaction.zip"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  environment { variables = local.shared_env }
}

resource "aws_lambda_event_source_mapping" "start_payment_sqs" {
  event_source_arn        = var.start_payment_queue_arn
  function_name           = aws_lambda_function.start_payment.arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]
}

resource "aws_lambda_event_source_mapping" "check_balance_sqs" {
  event_source_arn        = var.check_balance_queue_arn
  function_name           = aws_lambda_function.check_balance.arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]
}

resource "aws_lambda_event_source_mapping" "transaction_sqs" {
  event_source_arn        = var.transaction_queue_arn
  function_name           = aws_lambda_function.transaction.arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]
}