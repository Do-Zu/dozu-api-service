import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { transactionsModel } from '@/models/payment/transaction.model';
import { convertUsdToVnd } from '@/utils/conversion/conversion';
import { getCurrentDateInTimeZone, getDateFormattedWithTimeZone, getSystemDate } from '@/utils/date';
import { BadRequest, DatabaseError, NotFoundError } from '@/core/error';
import logger from '@/utils/logger';
import planService from '../subscription/plan.service';
import { GATEWAY } from './constants';
import { payOS } from './gateway/payos';
import { PaymentStatus } from './payment.interface';
import { addMilliseconds } from 'date-fns';
import { PaymentLinkRequest, PaymentLinkResponse, TransactionStatusUpdate } from './type';
import { and, eq, desc } from 'drizzle-orm';

export const REDIS_PREFIX_PAYMENT_GATEWAY_INFO = 'PAYMENT_REGISTER_PROCESS_GATEWAY_INFO';
/**
 * Service class for Payment functionality
 */
class PaymentService {
    private readonly EXPIRE_IN_MINUTE = 1; // Expiration time for cache within 1 minute
    private readonly REDIS_PREFIX = REDIS_PREFIX_PAYMENT_GATEWAY_INFO;

    /**
     * Creates a payment link using PayOS.
     * @param request - The payment link request data.
     * @returns A promise that resolves to the payment link response.
     */
    public async createPaymentLinkWithPayOS(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
        const { planId, timeZone, userId } = request;

        const plan = await planService.getPlanById(planId);

        if (!plan) {
            throw new Error('Server Error: Plan not found');
        }

        const ttlForExpirePayment = this.EXPIRE_IN_MINUTE * 60 * 1000; // 1 minutes

        const expireAt = addMilliseconds(getSystemDate(), ttlForExpirePayment);
        const expireAtTimeZone = getCurrentDateInTimeZone(timeZone, expireAt);

        const price = parseFloat(plan.price as string);

        const currencyVND = convertUsdToVnd(price);

        const paymentData = {
            ...request,
            planId,
            amount: currencyVND,
            expireAt: expireAtTimeZone,
        };

        const paymentRegisterResponse = await payOS.createPaymentLink(paymentData);

        if (!paymentRegisterResponse) {
            throw new Error('Server Error: Failed to create payment link');
        }

        const { orderCode, paymentLinkId, jobId } = paymentRegisterResponse;

        const currency = 'VND';

        const transaction = await this.initTransactionPayment({
            gateway: GATEWAY.PAYOS,
            userId,
            amount: currencyVND,
            currency,
            code: orderCode.toString(),
            paymentId: paymentLinkId,
            description: `Payment for plan ${plan.name}`,
            metadata: { planId, orderCode, jobId },
        });

        const redisKey = `${this.REDIS_PREFIX}:${orderCode}:${paymentLinkId}`;

        const dataStore = {
            planId,
            userId,
            expireAt: expireAtTimeZone,
            transactionId: transaction.transactionId,
            status: PaymentStatus.PENDING,
        };

        const plusTimeToTtlSecond = 10; // Adding 10 minute to the TTL to ensure the data is available for a short time after expiration
        const ttlCache = (this.EXPIRE_IN_MINUTE + plusTimeToTtlSecond) * 60;

        await redis.set(redisKey, dataStore, ttlCache);

        return {
            ...paymentRegisterResponse,
            expireAt: getDateFormattedWithTimeZone(expireAtTimeZone, timeZone),
            transactionId: transaction.transactionId,
            jobId,
        };
    }

    private async initTransactionPayment(transactionData: {
        gateway: string;
        userId: number;
        amount: number;
        currency: string;
        code?: string;
        paymentId?: string;
        description?: string;
        metadata?: object;
    }): Promise<{
        transactionId: number;
    }> {
        const { gateway, userId, amount, currency, code, paymentId, description, metadata } = transactionData;

        try {
            const [transaction] = await db
                .insert(transactionsModel)
                .values({
                    userId,
                    gateway,
                    amount: amount.toString(),
                    currency,
                    code,
                    status: PaymentStatus.PENDING,
                    paymentId,
                    description,
                    metadata,
                })
                .returning({
                    transactionId: transactionsModel.transactionId,
                });

            return transaction;
        } catch (error) {
            logger.error(`Error initializing transaction payment: ${error}`);
            throw new DatabaseError('Failed to initialize transaction payment');
        }
    }

    public async getTransactionOfGateway({ orderCode, paymentId }: { orderCode: number; paymentId: string }) {
        const [existing] = await db
            .select({
                userId: transactionsModel.userId,
                transactionId: transactionsModel.transactionId,
                status: transactionsModel.status,
                metadata: transactionsModel.metadata,
            })
            .from(transactionsModel)
            .where(and(eq(transactionsModel.code, orderCode.toString()), eq(transactionsModel.paymentId, paymentId)))
            .limit(1);

        return existing;
    }
    /**
     *
     * @param payment
     */
    public async updateTransactionStatus(payment: TransactionStatusUpdate) {
        const { userId, orderCode, paymentId, timezone } = payment;

        await db.transaction(async tx => {
            // Find the matching transaction
            const [existing] = await tx
                .select({
                    transactionId: transactionsModel.transactionId,
                    status: transactionsModel.status,
                })
                .from(transactionsModel)
                .where(
                    and(
                        eq(transactionsModel.userId, userId),
                        eq(transactionsModel.code, orderCode.toString()),
                        eq(transactionsModel.paymentId, paymentId)
                    )
                )
                .limit(1);

            if (!existing) {
                logger.warn(
                    `updateTransactionStatus: transaction not found for orderCode=${orderCode}, paymentId=${paymentId}`
                );

                throw new NotFoundError('Transaction Unavailable');
            }

            // If it's already success, do nothing
            if (existing.status !== PaymentStatus.PENDING) {
                logger.info(
                    `updateTransactionStatus: transaction status  already ${existing.status} for transactionId=${existing.transactionId}, skipping`
                );
                throw new BadRequest('Transaction exceed lifecycle');
            }

            await tx
                .update(transactionsModel)
                .set({
                    status: PaymentStatus.SUCCESS,
                    updatedAt: getCurrentDateInTimeZone(timezone),
                })
                .where(eq(transactionsModel.transactionId, existing.transactionId));
        });
    }

    /**
     * Get transaction history for a user
     * @param userId - The user ID
     * @param limit - Maximum number of transactions to return (default: 50)
     * @returns Array of transactions
     */
    public async getUserTransactionHistory(userId: number, limit: number = 50) {
        try {
            const transactions = await db
                .select({
                    transactionId: transactionsModel.transactionId,
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
                .where(eq(transactionsModel.userId, userId))
                .orderBy(desc(transactionsModel.createdAt))
                .limit(limit);

            return transactions;
        } catch (error) {
            logger.error(`Error getting user transaction history: ${error}`);
            throw new DatabaseError('Failed to get transaction history');
        }
    }
}

export const paymentService = new PaymentService();
