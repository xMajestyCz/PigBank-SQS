output "payment_table_name" {
  description = "Name of the payment table — share with payments repo"
  value       = module.dynamodb.payment_table_name
}

output "start_payment_queue_url" {
  description = "URL of start-payment-sqs — share with payments repo"
  value       = module.sqs.start_payment_queue_url
}

output "check_balance_queue_url" {
  value = module.sqs.check_balance_queue_url
}

output "transaction_queue_url" {
  value = module.sqs.transaction_queue_url
}