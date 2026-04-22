resource "aws_dynamodb_table" "payment_table" {
  name         = "payment-table-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "traceId"

  attribute {
    name = "traceId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    project = "payment-sqs-service"
    stage   = var.stage
  }
}