import { CheckoutRequestType, CheckoutResponseDataType } from '@payos/node/lib/type';
import { PaymentStatus } from './payment.interface';

export interface PaymentDataType
    extends Omit<CheckoutRequestType, 'returnUrl' | 'cancelUrl' | 'orderCode' | 'description'> {
    planId: number;
}

export interface PaymentData {
    [key: string]: string | number | boolean | null | undefined | PaymentData[] | PaymentData | ValidationData;
}

export interface ValidationData {
    [key: string]: any;
}

export interface PaymentLinkResponse extends CheckoutResponseDataType {
    baseUrlReturn: string;
    expireAt?: string;
    transactionId?: number;
    jobId: string;
    apiCheckStatus: string;
}

export interface PaymentLinkRequest extends PaymentDataType {
    planId: number;
    userId: number;
    timeZone: string;
}

export interface WebhookPaymentData {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId: string;
    counterAccountBankName: string;
    counterAccountName: string;
    counterAccountNumber: string;
    virtualAccountName: string;
    virtualAccountNumber: string;
}

export interface IPaymentResponseSePayRegister {
    orderCode: number | string;
    qrCode: string;
    expireAt?: string;
    jobId: string;
    amount: number;
    currency: string;
}

export interface PaymentSepayRegisterResponse extends IPaymentResponseSePayRegister {
    transactionId?: number;
}

export interface WebhookRequest {
    code: string;
    desc: string;
    success: boolean;
    data: WebhookPaymentData;
    signature: string;
}

export interface PaymentStatusUpdate {
    userId: number;
    planId: number;
    orderCode: number;
    paymentId: string;
    status: PaymentStatus;
    amount: number;
    timestamp: Date | string;
    timezone?: string;
}
export interface TransactionStatusUpdate {
    planId?: number;
    userId: number;
    orderCode: number;
    paymentId: string;
    timezone?: string;
    status?: string;
}

export interface SSEPaymentData {
    type: 'payment_status';
    data: PaymentStatusUpdate;
}
