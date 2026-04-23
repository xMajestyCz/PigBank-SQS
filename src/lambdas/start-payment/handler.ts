import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
);

const CHECK_BALANCE_QUEUE_URL = process.env.CHECK_BALANCE_QUEUE_URL ?? '';
const PAYMENT_TABLE_NAME      = process.env.PAYMENT_TABLE_NAME ?? 'payment-table-dev';
const DELAY_MS                = 5000;

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
  console.log('Processing record body:', record.body);

  const message = JSON.parse(record.body);
  const { traceId, cardId, userId, service } = message;

  console.log(`start-payment — traceId: ${traceId}`);

  // 1. Delay de 5 segundos
  await delay(DELAY_MS);

  // 2. Insertar en payment-table
  await dynamoDb.send(new PutCommand({
    TableName: PAYMENT_TABLE_NAME,
    Item: {
      traceId,
      cardId,
      userId,
      service,
      status:    'INITIAL',
      timestamp: Date.now().toString(),
    },
  }));

  console.log(`✅ Inserted in payment-table — traceId: ${traceId}, status: INITIAL`);

  // 3. Enviar a check-balance-sqs
  await sqs.send(new SendMessageCommand({
    QueueUrl:    CHECK_BALANCE_QUEUE_URL,
    MessageBody: JSON.stringify({ traceId }),
  }));

  console.log(`✅ Sent to check-balance-sqs — traceId: ${traceId}`);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));