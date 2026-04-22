output "start_payment_queue_arn" {
  value = aws_sqs_queue.start_payment.arn
}

output "start_payment_queue_url" {
  value = aws_sqs_queue.start_payment.url
}

output "check_balance_queue_arn" {
  value = aws_sqs_queue.check_balance.arn
}

output "check_balance_queue_url" {
  value = aws_sqs_queue.check_balance.url
}

output "transaction_queue_arn" {
  value = aws_sqs_queue.transaction.arn
}

output "transaction_queue_url" {
  value = aws_sqs_queue.transaction.url
}