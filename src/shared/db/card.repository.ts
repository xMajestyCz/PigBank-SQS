// Repositorio de solo lectura para consultar card-table-dev del card-service
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from './dynamo.client';

const TABLE_NAME = process.env.CARD_TABLE_NAME ?? 'card-table-dev';

export type CardType = 'DEBIT' | 'CREDIT';
export type CardStatus = 'ACTIVATED' | 'PENDING';

export interface Card {
    uuid: string;
    user_id: string;
    type: CardType;
    status: CardStatus;
    balance: number;
    createdAt: string;
}

export class CardRepository {

    async findByUuid(uuid: string): Promise<Card | null> {
        const result = await dynamoDb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: '#uuid = :uuid',
                ExpressionAttributeNames: { '#uuid': 'uuid' },
                ExpressionAttributeValues: { ':uuid': uuid },
                Limit: 1,
                ScanIndexForward: false,
            }),
        );

        const items = result.Items as Card[];
        return items?.length > 0 ? items[0] : null;
    }

    async updateBalance(uuid: string, createdAt: string, newBalance: number): Promise<void> {
        const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
        await dynamoDb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { uuid, createdAt },
                UpdateExpression: 'SET balance = :balance',
                ExpressionAttributeValues: { ':balance': newBalance },
            }),
        );
    }
}