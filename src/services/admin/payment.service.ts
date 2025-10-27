import db from '@/libs/drizzleClient.lib';
import { eq, and, gte, lte, sql, count, desc, or, like, ilike } from 'drizzle-orm';
import { transactionsModel } from '@/models/payment/transaction.model';
import { usersTable } from '@/models/user.model';
import { userSubscriptionsTable, plansTable } from '@/models/subscription';
import { NotFoundError, BadRequest } from '@/core/error';
import { GetPaymentsQueryDto, RefundTransactionDto, UpdateTransactionStatusDto } from '@/dtos/admin/payment.dto';

class AdminPaymentService {
    // ============ GET ALL PAYMENTS ============
    
    async getAllPayments(filters: GetPaymentsQueryDto) {
        const { status, gateway, startDate, endDate, page = '1', limit = '50', search } = filters;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const conditions = [];
        
        if (status) conditions.push(eq(transactionsModel.status, status));
        if (gateway) conditions.push(eq(transactionsModel.gateway, gateway));
        if (startDate) conditions.push(gte(transactionsModel.transactionDate, new Date(startDate)));
        if (endDate) conditions.push(lte(transactionsModel.transactionDate, new Date(endDate)));
        
        // Search by transaction code, payment ID, or user email
        if (search) {
            conditions.push(
                or(
                    ilike(transactionsModel.code, `%${search}%`),
                    ilike(transactionsModel.paymentId, `%${search}%`),
                    ilike(usersTable.email, `%${search}%`)
                )
            );
        }

        const payments = await db
            .select({
                transactionId: transactionsModel.transactionId,
                userId: transactionsModel.userId,
                username: usersTable.username,
                email: usersTable.email,
                gateway: transactionsModel.gateway,
                transactionDate: transactionsModel.transactionDate,
                accountNumber: transactionsModel.accountNumber,
                amount: transactionsModel.amount,
                currency: transactionsModel.currency,
                code: transactionsModel.code,
                paymentId: transactionsModel.paymentId,
                description: transactionsModel.description,
                status: transactionsModel.status,
                metadata: transactionsModel.metadata,
                createdAt: transactionsModel.createdAt,
            })
            .from(transactionsModel)
            .leftJoin(usersTable, eq(transactionsModel.userId, usersTable.userId))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(transactionsModel.createdAt))
            .limit(parseInt(limit))
            .offset(offset);

        // Get total count
        const totalResult = await db
            .select({ count: count() })
            .from(transactionsModel)
            .leftJoin(usersTable, eq(transactionsModel.userId, usersTable.userId))
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return {
            payments,
            total: Number(totalResult[0]?.count || 0),
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    // ============ GET PAYMENT BY ID ============
    
    async getPaymentById(transactionId: number) {
        const payment = await db
            .select({
                transactionId: transactionsModel.transactionId,
                userId: transactionsModel.userId,
                username: usersTable.username,
                email: usersTable.email,
                gateway: transactionsModel.gateway,
                transactionDate: transactionsModel.transactionDate,
                accountNumber: transactionsModel.accountNumber,
                amount: transactionsModel.amount,
                currency: transactionsModel.currency,
                code: transactionsModel.code,
                paymentId: transactionsModel.paymentId,
                description: transactionsModel.description,
                status: transactionsModel.status,
                metadata: transactionsModel.metadata,
                createdAt: transactionsModel.createdAt,
                updatedAt: transactionsModel.updatedAt,
            })
            .from(transactionsModel)
            .leftJoin(usersTable, eq(transactionsModel.userId, usersTable.userId))
            .where(eq(transactionsModel.transactionId, transactionId))
            .limit(1);

        return payment[0] || null;
    }

    // ============ UPDATE TRANSACTION STATUS ============
    
    async updateTransactionStatus(transactionId: number, data: UpdateTransactionStatusDto) {
        const transaction = await this.getPaymentById(transactionId);
        if (!transaction) throw new NotFoundError('Transaction not found');

        const result = await db
            .update(transactionsModel)
            .set({
                status: data.status,
                metadata: data.note 
                    ? { ...transaction.metadata as any, adminNote: data.note }
                    : transaction.metadata,
                updatedAt: new Date(),
            })
            .where(eq(transactionsModel.transactionId, transactionId))
            .returning();

        return result[0];
    }

    // ============ REFUND TRANSACTION ============
    
    async refundTransaction(data: RefundTransactionDto) {
        const transaction = await this.getPaymentById(data.transactionId);
        if (!transaction) throw new NotFoundError('Transaction not found');

        if (transaction.status !== 'success') {
            throw new BadRequest('Can only refund successful transactions');
        }

        // Check if already refunded
        const metadata = transaction.metadata as any;
        if (metadata?.refunded) {
            throw new BadRequest('Transaction already refunded');
        }

        const refundAmount = data.amount 
            ? parseFloat(data.amount) 
            : parseFloat(transaction.amount);

        if (refundAmount > parseFloat(transaction.amount)) {
            throw new BadRequest('Refund amount cannot exceed original amount');
        }

        const isPartialRefund = refundAmount < parseFloat(transaction.amount);

        // Update transaction with refund info
        const result = await db
            .update(transactionsModel)
            .set({
                status: isPartialRefund ? 'success' : 'cancelled',
                metadata: {
                    ...metadata,
                    refunded: true,
                    refundAmount: refundAmount.toString(),
                    refundReason: data.reason,
                    refundedAt: new Date().toISOString(),
                    isPartialRefund,
                },
                updatedAt: new Date(),
            })
            .where(eq(transactionsModel.transactionId, data.transactionId))
            .returning();

        return {
            transaction: result[0],
            refundAmount,
            isPartialRefund,
        };
    }

    // ============ GET PAYMENT STATISTICS ============
    
    async getPaymentStats(startDate?: Date, endDate?: Date) {
        const now = new Date();
        const start = startDate || new Date(now.setMonth(now.getMonth() - 1));
        const end = endDate || new Date();

        const conditions = [
            gte(transactionsModel.transactionDate, start),
            lte(transactionsModel.transactionDate, end),
        ];

        // Total by status
        const statusStats = await db
            .select({
                status: transactionsModel.status,
                count: count(),
                totalAmount: sql<string>`COALESCE(SUM(${transactionsModel.amount}), 0)`,
            })
            .from(transactionsModel)
            .where(and(...conditions))
            .groupBy(transactionsModel.status);

        // Gateway stats
        const gatewayStats = await db
            .select({
                gateway: transactionsModel.gateway,
                count: count(),
                totalAmount: sql<string>`COALESCE(SUM(${transactionsModel.amount}), 0)`,
            })
            .from(transactionsModel)
            .where(and(...conditions))
            .groupBy(transactionsModel.gateway)
            .orderBy(desc(count()));

        // Failed transactions
        const failedTransactions = await db
            .select({ count: count() })
            .from(transactionsModel)
            .where(
                and(
                    ...conditions,
                    eq(transactionsModel.status, 'failed')
                )
            );

        const failedCount = Number(failedTransactions[0]?.count || 0);

        return {
            statusBreakdown: statusStats.map((s) => ({
                status: s.status,
                count: Number(s.count),
                totalAmount: parseFloat(s.totalAmount),
            })),
            gatewayBreakdown: gatewayStats.map((g) => ({
                gateway: g.gateway,
                count: Number(g.count),
                totalAmount: parseFloat(g.totalAmount),
            })),
            failedCount,
        };
    }

    // ============ EXPORT PAYMENTS TO CSV ============
    
    async exportPaymentsToCsv(filters: GetPaymentsQueryDto) {
        // Get all payments without pagination for export
        const { status, gateway, startDate, endDate, search } = filters;
        
        const conditions = [];
        if (status) conditions.push(eq(transactionsModel.status, status));
        if (gateway) conditions.push(eq(transactionsModel.gateway, gateway));
        if (startDate) conditions.push(gte(transactionsModel.transactionDate, new Date(startDate)));
        if (endDate) conditions.push(lte(transactionsModel.transactionDate, new Date(endDate)));
        if (search) {
            conditions.push(
                or(
                    ilike(transactionsModel.code, `%${search}%`),
                    ilike(transactionsModel.paymentId, `%${search}%`),
                    ilike(usersTable.email, `%${search}%`)
                )
            );
        }

        const payments = await db
            .select({
                transactionId: transactionsModel.transactionId,
                transactionDate: transactionsModel.transactionDate,
                email: usersTable.email,
                username: usersTable.username,
                gateway: transactionsModel.gateway,
                code: transactionsModel.code,
                paymentId: transactionsModel.paymentId,
                amount: transactionsModel.amount,
                currency: transactionsModel.currency,
                status: transactionsModel.status,
                description: transactionsModel.description,
            })
            .from(transactionsModel)
            .leftJoin(usersTable, eq(transactionsModel.userId, usersTable.userId))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(transactionsModel.createdAt));

        return payments;
    }
}

export const adminPaymentService = new AdminPaymentService();

