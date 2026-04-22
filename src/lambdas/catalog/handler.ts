import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Redis from 'ioredis';
import { Service } from '../../shared/models/service.model';

// El cliente Redis se inicializa fuera del handler para reutilizar la conexión
// entre invocaciones (Lambda warm start)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
            connectTimeout: 5000,
            lazyConnect: true,
        });
    }
    return redisClient;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const redis = getRedisClient();

        // Obtener todos los servicios del cluster Redis
        // La clave 'catalog' contiene el array JSON de servicios
        const catalogRaw = await redis.get('catalog');

        if (!catalogRaw) {
            return response(404, { message: 'Catalog not available' });
        }

        const catalog: Service[] = JSON.parse(catalogRaw);

        // Filtrar solo servicios activos
        const activeServices = catalog.filter(s => s.estado === 'Activo');

        return response(200, activeServices);

    } catch (error) {
        console.error('Error fetching catalog from Redis:', error);
        return response(500, { message: 'Internal server error' });
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function response(statusCode: number, body: object | object[]): APIGatewayProxyResult {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}