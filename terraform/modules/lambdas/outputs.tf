output "payment_lambda_arn"  { value = aws_lambda_function.payment.arn }
output "payment_lambda_name" { value = aws_lambda_function.payment.function_name }
output "catalog_lambda_arn"  { value = aws_lambda_function.catalog.arn }
output "catalog_lambda_name" { value = aws_lambda_function.catalog.function_name }