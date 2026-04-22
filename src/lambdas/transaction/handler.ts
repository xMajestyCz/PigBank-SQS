import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { PaymentRepository } from '../../shared/db/payment.repository';
import { CardRepository } from '../../shared/db/card.repository';

const paymentRepository = new PaymentRepository();
const cardRepository = new CardRepository();
const DELAY_MS = 5000;
const CARD_SERVICE_URL = process.env.CARD_SERVICE_URL ?? '';

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

    console.log(`transaction — traceId: ${traceId}`);

    // 1. Simular delay de 5 segundos
    await delay(DELAY_MS);

    // 2. Buscar el payment
    const payment = await paymentRepository.findByTraceId(traceId);

    if (!payment) {
        throw new Error(`Payment not found for traceId: ${traceId}`);
    }

    // 3. Buscar la tarjeta para verificar saldo actualizado
    const card = await cardRepository.findByUuid(payment.cardId);

    if (!card) {
        await paymentRepository.updateStatus(traceId, 'FAILED', 'Card not found');
        return;
    }

    const amount = payment.service.precio_mensual;

    // 4. Verificar saldo una vez más (doble validación)
    if (card.balance < amount) {
        await paymentRepository.updateStatus(
            traceId,
            'FAILED',
            'La cuenta no tiene saldo disponible',
        );
        return;
    }

    // 5. Descontar saldo de la tarjeta
    const newBalance = card.balance - amount;
    await cardRepository.updateBalance(card.uuid, card.createdAt, newBalance);

    // 6. Registrar transacción en el card-service via POST /transactions/purchase
    try {
        const purchaseResponse = await fetch(`${CARD_SERVICE_URL}/transactions/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchant: `${payment.service.proveedor} - ${payment.service.servicio}`,
                cardId: payment.cardId,
                amount,
            }),
        });

        if (!purchaseResponse.ok) {
            console.warn(`card-service purchase registration failed — traceId: ${traceId}`);
        }
    } catch (error) {
        // No fallamos el pago si el registro en card-service falla
        console.warn(`Error calling card-service — traceId: ${traceId}`, error);
    }

    // 7. Actualizar status a FINISH
    await paymentRepository.updateStatus(traceId, 'FINISH');

    console.log(`transaction complete — traceId: ${traceId}, status: FINISH, amount: ${amount}`);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));