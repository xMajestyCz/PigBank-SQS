import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from './dynamo.client';
import { Payment, CreatePaymentInput, PaymentStatus } from '../models/payment.model';

const TABLE_NAME = process.env.PAYMENT_TABLE_NAME ?? 'payment-table';

export class PaymentRepository {

    // ─── CREATE ────────────────────────────────────────────────────────────────

    async create(input: CreatePaymentInput): Promise<Payment> {
        const payment: Payment = {
            traceId: uuidv4(),
            userId: input.userId,
            cardId: input.cardId,
            service: input.service,
            status: 'INITIAL',
            timestamp: Date.now().toString(),
        };

        await dynamoDb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: payment,
            }),
        );

        return payment;
    }

    // ─── GET BY TRACE ID ───────────────────────────────────────────────────────

    async findByTraceId(traceId: string): Promise<Payment | null> {
        const result = await dynamoDb.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { traceId },
            }),
        );

        return (result.Item as Payment) ?? null;
    }

    // ─── UPDATE STATUS ─────────────────────────────────────────────────────────

    async updateStatus(traceId: string, status: PaymentStatus, error?: string): Promise<Payment> {
        const updateExpression = error
            ? 'SET #status = :status, #error = :error, #timestamp = :timestamp'
            : 'SET #status = :status, #timestamp = :timestamp';

        const expressionAttributeValues: Record<string, any> = {
            ':status': status,
            ':timestamp': Date.now().toString(),
        };

        if (error) {
            expressionAttributeValues[':error'] = error;
        }

        const result = await dynamoDb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { traceId },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#timestamp': 'timestamp',
                    ...(error ? { '#error': 'error' } : {}),
                },
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }),
        );

        return result.Attributes as Payment;
    }
}