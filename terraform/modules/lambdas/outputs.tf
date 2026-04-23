output "start_payment_lambda_arn"  { value = aws_lambda_function.start_payment.arn }
output "check_balance_lambda_arn"  { value = aws_lambda_function.check_balance.arn }
output "transaction_lambda_arn"    { value = aws_lambda_function.transaction.arn }