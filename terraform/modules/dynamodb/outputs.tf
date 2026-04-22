output "payment_table_name" {
  value = aws_dynamodb_table.payment_table.name
}

output "payment_table_arn" {
  value = aws_dynamodb_table.payment_table.arn
}