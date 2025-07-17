/**
 * SePay webhook data types and interfaces
 */

export interface SepayWebhookData {
    id: number; // Transaction ID on SePay
    gateway: string; // Brand name of the bank
    transactionDate: string; // Time of transaction on the bank's side
    accountNumber: string; // Bank account number
    code: string | null; // Payment code (sepay automatically identifies based on the configuration)
    content: string; // Transfer content
    transferType: 'in' | 'out'; // Transaction type. in is the money in, out is the money out
    transferAmount: number; // Transaction amount
    accumulated: number; // Account balance (cumulative)
    subAccount: string | null; // Sub-bank account (identified account)
    referenceCode: string; // Reference code of sms message
    description: string; // Full content of sms message
}

export interface SepayWebhookRequest {
    data?: SepayWebhookData;
    // Add any other SePay webhook fields if needed
}

export interface SepayPaymentMapping {
    userId: number;
    planId: number;
    orderCode: number;
    amount: number;
    jobId: string; // SSE job identifier
    createdAt: string;
    expireAt: string;
}

// Content pattern types for identifying payments
export interface PaymentContentPattern {
    orderCode: number;
    userId?: number;
    planId?: number;
}
