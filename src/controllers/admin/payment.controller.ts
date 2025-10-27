import { Request, Response } from 'express';
import { adminPaymentService } from '@/services/admin/payment.service';
import { SuccessResponse } from '@/core/success';
import { 
    getPaymentsQuerySchema, 
    refundTransactionSchema, 
    updateTransactionStatusSchema 
} from '@/dtos/admin/payment.dto';

class AdminPaymentController {
    async getAllPayments(req: Request, res: Response) {
        const validatedQuery = getPaymentsQuerySchema.parse(req.query);
        const result = await adminPaymentService.getAllPayments(validatedQuery);
        SuccessResponse.ok(res, result, 'Payments retrieved successfully');
    }

    async getPaymentById(req: Request, res: Response) {
        const transactionId = parseInt(req.params.id);
        const payment = await adminPaymentService.getPaymentById(transactionId);
        SuccessResponse.ok(res, payment, 'Payment retrieved successfully');
    }

    async updateTransactionStatus(req: Request, res: Response) {
        const transactionId = parseInt(req.params.id);
        const validatedData = updateTransactionStatusSchema.parse(req.body);
        const result = await adminPaymentService.updateTransactionStatus(transactionId, validatedData);
        SuccessResponse.ok(res, result, 'Transaction status updated successfully');
    }

    async refundTransaction(req: Request, res: Response) {
        const validatedData = refundTransactionSchema.parse(req.body);
        const result = await adminPaymentService.refundTransaction(validatedData);
        SuccessResponse.ok(res, result, 'Transaction refunded successfully');
    }

    async getPaymentStats(req: Request, res: Response) {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const stats = await adminPaymentService.getPaymentStats(startDate, endDate);
        SuccessResponse.ok(res, stats, 'Payment statistics retrieved successfully');
    }

    async exportPaymentsCsv(req: Request, res: Response) {
        const validatedQuery = getPaymentsQuerySchema.parse(req.query);
        const payments = await adminPaymentService.exportPaymentsToCsv(validatedQuery);
        
        // Convert to CSV format
        const csvHeaders = [
            'Transaction ID',
            'Date',
            'User Email',
            'Username',
            'Gateway',
            'Transaction Code',
            'Payment ID',
            'Amount',
            'Currency',
            'Status',
            'Description',
        ].join(',');

        const csvRows = payments.map((p) => [
            p.transactionId,
            p.transactionDate ? new Date(p.transactionDate).toISOString() : '',
            p.email || '',
            p.username || '',
            p.gateway,
            p.code || '',
            p.paymentId || '',
            p.amount,
            p.currency,
            p.status,
            `"${(p.description || '').replace(/"/g, '""')}"`, // Escape quotes
        ].join(','));

        const csv = [csvHeaders, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.csv`);
        res.send(csv);
    }
}

export const adminPaymentController = new AdminPaymentController();

