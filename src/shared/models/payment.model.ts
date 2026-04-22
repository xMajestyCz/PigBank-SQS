export type PaymentStatus = 'INITIAL' | 'IN_PROGRESS' | 'FAILED' | 'FINISH';

export interface ServiceInfo {
    id: number;
    categoria: string;
    proveedor: string;
    servicio: string;
    plan: string;
    precio_mensual: number;
    detalles: string;
    estado: string;
}

export interface Payment {
    traceId: string;
    userId: string;
    cardId: string;
    service: ServiceInfo;
    status: PaymentStatus;
    error?: string;
    timestamp: string;
}

export interface CreatePaymentInput {
    userId: string;
    cardId: string;
    service: ServiceInfo;
}