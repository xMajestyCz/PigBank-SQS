# ── DLQs ───────────────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "start_payment_dlq" {
  name                      = "start-payment-dlq-${var.stage}"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "check_balance_dlq" {
  name                      = "check-balance-dlq-${var.stage}"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "transaction_dlq" {
  name                      = "transaction-dlq-${var.stage}"
  message_retention_seconds = 1209600
}

# ── Main queues ────────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "start_payment" {
  name                       = "start-payment-sqs-${var.stage}"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.start_payment_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    project = "payment-sqs-service"
    stage   = var.stage
  }
}

resource "aws_sqs_queue" "check_balance" {
  name                       = "check-balance-sqs-${var.stage}"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.check_balance_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    project = "payment-sqs-service"
    stage   = var.stage
  }
}

resource "aws_sqs_queue" "transaction" {
  name                       = "transaction-sqs-${var.stage}"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.transaction_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    project = "payment-sqs-service"
    stage   = var.stage
  }
}