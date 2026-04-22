output "api_gateway_url" {
  value = module.api_gateway.api_url
}

output "payment_table_name" {
  value = module.dynamodb.payment_table_name
}

output "start_payment_queue_url" {
  value = module.sqs.start_payment_queue_url
}

output "check_balance_queue_url" {
  value = module.sqs.check_balance_queue_url
}

output "transaction_queue_url" {
  value = module.sqs.transaction_queue_url
}