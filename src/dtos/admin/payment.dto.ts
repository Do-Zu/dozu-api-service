import { z } from 'zod';

export const getPaymentsQuerySchema = z.object({
    status: z.enum(['pending', 'processing', 'success', 'failed', 'expired', 'cancelled']).optional(),
    gateway: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(), // Search by transaction code, user email, etc.
});

export const refundTransactionSchema = z.object({
    transactionId: z.number().int().positive(),
    reason: z.string().min(1, 'Refund reason is required'),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), // Partial refund amount
});

export const updateTransactionStatusSchema = z.object({
    status: z.enum(['pending', 'processing', 'success', 'failed', 'expired', 'cancelled']),
    note: z.string().optional(),
});

export type GetPaymentsQueryDto = z.infer<typeof getPaymentsQuerySchema>;
export type RefundTransactionDto = z.infer<typeof refundTransactionSchema>;
export type UpdateTransactionStatusDto = z.infer<typeof updateTransactionStatusSchema>;

