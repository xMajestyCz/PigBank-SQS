import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
);

const TRANSACTION_QUEUE_URL = process.env.TRANSACTION_QUEUE_URL ?? '';
const PAYMENT_TABLE_NAME    = process.env.PAYMENT_TABLE_NAME ?? 'payment-table-dev';
const CARD_TABLE_NAME       = process.env.CARD_TABLE_NAME ?? 'card-table-dev';
const DELAY_MS              = 5000;

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log('Event received:', JSON.stringify(event));
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processRecord(record: SQSRecord): Promise<void> {
  const { traceId } = JSON.parse(record.body);

  console.log(`check-balance — traceId: ${traceId}`);

  // 1. Delay de 5 segundos
  await delay(DELAY_MS);

  // 2. Buscar payment
  const paymentResult = await dynamoDb.send(new GetCommand({
    TableName: PAYMENT_TABLE_NAME,
    Key:       { traceId },
  }));

  const payment = paymentResult.Item;

  if (!payment) {
    throw new Error(`Payment not found for traceId: ${traceId}`);
  }

  console.log(`Payment found — cardId: ${payment.cardId}`);

  // 3. Buscar tarjeta
  const cardResult = await dynamoDb.send(new QueryCommand({
    TableName:                 CARD_TABLE_NAME,
    KeyConditionExpression:    '#uuid = :uuid',
    ExpressionAttributeNames:  { '#uuid': 'uuid' },
    ExpressionAttributeValues: { ':uuid': payment.cardId },
    Limit:                     1,
    ScanIndexForward:          false,
  }));

  const card = cardResult.Items?.[0];

  if (!card) {
    await updateStatus(traceId, 'FAILED', 'Tarjeta no encontrada');
    console.error(`check-balance FAILED — card not found`);
    return;
  }

  console.log(`Card found — balance: ${card.balance}, required: ${payment.service.precio_mensual}`);

  // 4. Verificar saldo
  if (card.balance < payment.service.precio_mensual) {
    await updateStatus(traceId, 'FAILED', 'La cuenta no tiene saldo disponible');
    console.error(`check-balance FAILED — insufficient balance`);
    return;
  }

  // 5. Actualizar status a IN_PROGRESS
  await updateStatus(traceId, 'IN_PROGRESS');
  console.log(`✅ check-balance complete — status: IN_PROGRESS`);

  // 6. Enviar a transaction-sqs
  await sqs.send(new SendMessageCommand({
    QueueUrl:    TRANSACTION_QUEUE_URL,
    MessageBody: JSON.stringify({ traceId }),
  }));

  console.log(`✅ Sent to transaction-sqs — traceId: ${traceId}`);
}

async function updateStatus(traceId: string, status: string, error?: string): Promise<void> {
  const updateExpression = error
    ? 'SET #status = :status, #error = :error, #timestamp = :timestamp'
    : 'SET #status = :status, #timestamp = :timestamp';

  const expressionAttributeValues: Record<string, any> = {
    ':status':    status,
    ':timestamp': Date.now().toString(),
  };

  if (error) expressionAttributeValues[':error'] = error;

  await dynamoDb.send(new UpdateCommand({
    TableName:                 PAYMENT_TABLE_NAME,
    Key:                       { traceId },
    UpdateExpression:          updateExpression,
    ExpressionAttributeNames:  {
      '#status':    'status',
      '#timestamp': 'timestamp',
      ...(error ? { '#error': 'error' } : {}),
    },
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));