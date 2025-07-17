export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SUCCESS = 'success',
    PAID = 'paid',
    FAILED = 'failed',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

export enum GateWay {
    STRIPE = 'stripe',
    PAYOS = 'payos',
    SEPAY = 'sepay',
}
type TypeGateway = keyof typeof GateWay;

export interface PaymentRequest {
    currency?: string;
    gateway: TypeGateway;
}

export interface PaymentGateway {
    createPayment(request: object): Promise<unknown>;
    getPaymentStatus(request:object): Promise<unknown>;
    handleWebhook(payload: object): Promise<unknown>;
    validateSignature(payload: unknown, signature: string): boolean;
}
