import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PaymentRepository } from '../../shared/db/payment.repository';
import { CardRepository } from '../../shared/db/card.repository';
import { Service } from '../../shared/models/service.model';

const paymentRepository = new PaymentRepository();
const cardRepository = new CardRepository();
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const START_PAYMENT_QUEUE_URL = process.env.START_PAYMENT_QUEUE_URL ?? '';

interface PaymentBody {
    cardId: string;
    service: Service;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {

        // ── GET /payment/{traceId} ─────────────────────────────────────────────
        if (event.httpMethod === 'GET') {
            const traceId = event.pathParameters?.traceId;

            if (!traceId) {
                return response(400, { message: 'traceId is required in path' });
            }

            const payment = await paymentRepository.findByTraceId(traceId);

            if (!payment) {
                return response(404, { message: `Payment not found: ${traceId}` });
            }

            return response(200, payment);
        }

        // ── POST /payment ──────────────────────────────────────────────────────
        const body = parseBody(event.body);
        const validationError = validateBody(body);

        if (validationError) {
            return response(400, { message: validationError });
        }

        // 1. Validar que la tarjeta existe y está ACTIVATED
        const card = await cardRepository.findByUuid(body.cardId!);

        if (!card) {
            return response(404, { message: `Card not found: ${body.cardId}` });
        }

        if (card.status !== 'ACTIVATED') {
            return response(422, { message: `Card is not active. Current status: ${card.status}` });
        }

        if (card.type !== 'DEBIT') {
            return response(422, { message: 'Only DEBIT cards can process payments' });
        }

        // 2. Verificar que tiene saldo suficiente antes de iniciar el flujo
        if (card.balance < body.service!.precio_mensual) {
            return response(422, {
                message: 'Insufficient balance',
                available: card.balance,
                required: body.service!.precio_mensual,
            });
        }

        // 3. Crear el registro de pago en DynamoDB con status INITIAL
        const payment = await paymentRepository.create({
            userId: card.user_id,
            cardId: body.cardId!,
            service: body.service!,
        });

        // 4. Enviar traceId a la cola start-payment-sqs
        await sqs.send(new SendMessageCommand({
            QueueUrl: START_PAYMENT_QUEUE_URL,
            MessageBody: JSON.stringify({ traceId: payment.traceId }),
        }));

        console.log(`Payment initiated — traceId: ${payment.traceId}, cardId: ${body.cardId}`);

        // 5. Retornar traceId al frontend
        return response(201, { traceId: payment.traceId });

    } catch (error) {
        console.error('Error processing payment:', error);
        return response(500, { message: 'Internal server error' });
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseBody(raw: string | null): Partial<PaymentBody> {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function validateBody(body: Partial<PaymentBody>): string | null {
    if (!body.cardId) return 'cardId is required';
    if (!body.service) return 'service is required';
    if (!body.service.id) return 'service.id is required';
    if (!body.service.precio_mensual) return 'service.precio_mensual is required';
    if (body.service.precio_mensual <= 0) return 'service.precio_mensual must be greater than 0';
    return null;
}

function response(statusCode: number, body: object): APIGatewayProxyResult {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}