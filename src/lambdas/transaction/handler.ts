import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
);

const PAYMENT_TABLE_NAME = process.env.PAYMENT_TABLE_NAME ?? 'payment-table-dev';
const CARD_TABLE_NAME    = process.env.CARD_TABLE_NAME ?? 'card-table-dev';
const CARD_SERVICE_URL   = process.env.CARD_SERVICE_URL ?? '';
const DELAY_MS           = 5000;

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

  console.log(`transaction — traceId: ${traceId}`);

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
    return;
  }

  const amount = payment.service.precio_mensual;

  // 4. Doble validación de saldo
  if (card.balance < amount) {
    await updateStatus(traceId, 'FAILED', 'La cuenta no tiene saldo disponible');
    return;
  }

  // 5. Descontar saldo
  const newBalance = card.balance - amount;
  await dynamoDb.send(new UpdateCommand({
    TableName:                 CARD_TABLE_NAME,
    Key:                       { uuid: card.uuid, createdAt: card.createdAt },
    UpdateExpression:          'SET balance = :balance',
    ExpressionAttributeValues: { ':balance': newBalance },
  }));

  console.log(`✅ Balance updated — old: ${card.balance}, new: ${newBalance}`);

  // 6. Llamar a card-service POST /transactions/purchase
  try {
    const res = await fetch(`${CARD_SERVICE_URL}/transactions/purchase`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        merchant: `${payment.service.proveedor} - ${payment.service.servicio}`,
        cardId:   payment.cardId,
        amount,
      }),
    });
    console.log(`card-service response: ${res.status}`);
  } catch (error) {
    console.warn(`Error calling card-service:`, error);
  }

  // 7. Actualizar status a FINISH
  await updateStatus(traceId, 'FINISH');
  console.log(`✅ transaction complete — traceId: ${traceId}, status: FINISH`);
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