import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PaymentRepository } from '../../shared/db/payment.repository';
import { CardRepository } from '../../shared/db/card.repository';

const paymentRepository = new PaymentRepository();
const cardRepository = new CardRepository();
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const TRANSACTION_QUEUE_URL = process.env.TRANSACTION_QUEUE_URL ?? '';
const DELAY_MS = 5000;

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

    console.log(`check-balance — traceId: ${traceId}`);

    // 1. Simular delay de 5 segundos
    await delay(DELAY_MS);

    // 2. Buscar el payment
    const payment = await paymentRepository.findByTraceId(traceId);

    if (!payment) {
        throw new Error(`Payment not found for traceId: ${traceId}`);
    }

    // 3. Buscar la tarjeta y verificar saldo
    const card = await cardRepository.findByUuid(payment.cardId);

    if (!card) {
        await paymentRepository.updateStatus(traceId, 'FAILED', 'Card not found');
        console.error(`check-balance FAILED — card not found, traceId: ${traceId}`);
        return;
    }

    const requiredAmount = payment.service.precio_mensual;

    if (card.balance < requiredAmount) {
        await paymentRepository.updateStatus(
            traceId,
            'FAILED',
            'La cuenta no tiene saldo disponible',
        );
        console.error(`check-balance FAILED — insufficient balance, traceId: ${traceId}`);
        return;
    }

    // 4. Saldo suficiente → actualizar status a IN_PROGRESS
    await paymentRepository.updateStatus(traceId, 'IN_PROGRESS');

    console.log(`check-balance complete — traceId: ${traceId}, status: IN_PROGRESS`);

    // 5. Enviar traceId a transaction-sqs
    await sqs.send(new SendMessageCommand({
        QueueUrl: TRANSACTION_QUEUE_URL,
        MessageBody: JSON.stringify({ traceId }),
    }));
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));