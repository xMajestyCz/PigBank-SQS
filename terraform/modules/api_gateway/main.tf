resource "aws_api_gateway_rest_api" "payment_service" {
  name        = "payment-sqs-api-${var.stage}"
  description = "Payment SQS Service API Gateway"
}

# ── /payment ───────────────────────────────────────────────────────────────────

resource "aws_api_gateway_resource" "payment" {
  rest_api_id = aws_api_gateway_rest_api.payment_service.id
  parent_id   = aws_api_gateway_rest_api.payment_service.root_resource_id
  path_part   = "payment"
}

# POST /payment
resource "aws_api_gateway_method" "payment_post" {
  rest_api_id   = aws_api_gateway_rest_api.payment_service.id
  resource_id   = aws_api_gateway_resource.payment.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payment_post" {
  rest_api_id             = aws_api_gateway_rest_api.payment_service.id
  resource_id             = aws_api_gateway_resource.payment.id
  http_method             = aws_api_gateway_method.payment_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.payment_lambda_arn}/invocations"
}

resource "aws_lambda_permission" "payment_post" {
  statement_id  = "AllowAPIGatewayInvokePost"
  action        = "lambda:InvokeFunction"
  function_name = var.payment_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.payment_service.execution_arn}/*/*"
}

# GET /payment/{traceId}
resource "aws_api_gateway_resource" "payment_by_trace_id" {
  rest_api_id = aws_api_gateway_rest_api.payment_service.id
  parent_id   = aws_api_gateway_resource.payment.id
  path_part   = "{traceId}"
}

resource "aws_api_gateway_method" "payment_get" {
  rest_api_id   = aws_api_gateway_rest_api.payment_service.id
  resource_id   = aws_api_gateway_resource.payment_by_trace_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payment_get" {
  rest_api_id             = aws_api_gateway_rest_api.payment_service.id
  resource_id             = aws_api_gateway_resource.payment_by_trace_id.id
  http_method             = aws_api_gateway_method.payment_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.payment_lambda_arn}/invocations"
}

resource "aws_lambda_permission" "payment_get" {
  statement_id  = "AllowAPIGatewayInvokeGet"
  action        = "lambda:InvokeFunction"
  function_name = var.payment_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.payment_service.execution_arn}/*/*"
}

# ── /catalog ───────────────────────────────────────────────────────────────────

resource "aws_api_gateway_resource" "catalog" {
  rest_api_id = aws_api_gateway_rest_api.payment_service.id
  parent_id   = aws_api_gateway_rest_api.payment_service.root_resource_id
  path_part   = "catalog"
}

resource "aws_api_gateway_method" "catalog_get" {
  rest_api_id   = aws_api_gateway_rest_api.payment_service.id
  resource_id   = aws_api_gateway_resource.catalog.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "catalog_get" {
  rest_api_id             = aws_api_gateway_rest_api.payment_service.id
  resource_id             = aws_api_gateway_resource.catalog.id
  http_method             = aws_api_gateway_method.catalog_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.catalog_lambda_arn}/invocations"
}

resource "aws_lambda_permission" "catalog_get" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.catalog_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.payment_service.execution_arn}/*/*"
}

# ── Deployment ─────────────────────────────────────────────────────────────────

resource "aws_api_gateway_deployment" "payment_service" {
  rest_api_id = aws_api_gateway_rest_api.payment_service.id

  depends_on = [
    aws_api_gateway_integration.payment_post,
    aws_api_gateway_integration.payment_get,
    aws_api_gateway_integration.catalog_get,
  ]

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.payment.id,
      aws_api_gateway_resource.payment_by_trace_id.id,
      aws_api_gateway_resource.catalog.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "payment_service" {
  deployment_id = aws_api_gateway_deployment.payment_service.id
  rest_api_id   = aws_api_gateway_rest_api.payment_service.id
  stage_name    = var.stage
}

data "aws_region" "current" {}