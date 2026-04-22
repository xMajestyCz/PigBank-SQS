import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PaymentRepository } from '../../shared/db/payment.repository';

const paymentRepository = new PaymentRepository();
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const CHECK_BALANCE_QUEUE_URL = process.env.CHECK_BALANCE_QUEUE_URL ?? '';
const DELAY_MS = 5000; // 5 segundos simulando validación financiera

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
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

    console.log(`start-payment — traceId: ${traceId}`);

    // 1. Simular delay de 5 segundos
    await delay(DELAY_MS);

    // 2. Buscar el payment en DynamoDB
    const payment = await paymentRepository.findByTraceId(traceId);

    if (!payment) {
        throw new Error(`Payment not found for traceId: ${traceId}`);
    }

    // 3. Actualizar status a INITIAL (confirmar que el proceso arrancó)
    await paymentRepository.updateStatus(traceId, 'INITIAL');

    console.log(`start-payment complete — traceId: ${traceId}, status: INITIAL`);

    // 4. Enviar traceId a check-balance-sqs
    await sqs.send(new SendMessageCommand({
        QueueUrl: CHECK_BALANCE_QUEUE_URL,
        MessageBody: JSON.stringify({ traceId }),
    }));
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));