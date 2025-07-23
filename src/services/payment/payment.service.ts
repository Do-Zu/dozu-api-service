import { DatabaseError } from '@/core/error';
import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { transactionsModel } from '@/models/payment/transaction.model';
import { compareIgnoreCapitalization } from '@/utils/common';
import { convertUsdToVnd } from '@/utils/conversion/conversion';
import { getCurrentDateInTimeZone, getDateFormattedWithTimeZone } from '@/utils/date';
import logger from '@/utils/logger';
import planService from '../subscription/plan.service';
import { GATEWAY } from './constants';
import { payOS } from './gateway/payos';
import { sepayPayment } from './gateway/sepay';
import { PaymentStatus } from './payment.interface';
import {
    PaymentLinkRequest,
    PaymentLinkResponse,
    PaymentSepayRegisterResponse,
    PaymentStatusUpdate,
    WebhookRequest,
} from './type';

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

        const ttlForExpirePayment = this.EXPIRE_IN_MINUTE * 60 * 1000;

        const timeExpireMilliseconds = new Date().getTime() + ttlForExpirePayment;

        const expireAt = new Date(timeExpireMilliseconds);

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

        const transaction = await this.initTransactionPayment({
            gateway: GATEWAY.PAYOS,
            userId,
            amount: currencyVND,
            currency: 'VND',
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

    /**
     * Creates a payment link using SePay gateway.
     * @param request - The payment link request data.
     * @returns A promise that resolves to the payment link response.
     */
    public async createPaymentLinkWithSepay(request: PaymentLinkRequest): Promise<PaymentSepayRegisterResponse> {
        const { planId, timeZone, userId } = request;

        const plan = await planService.getPlanById(planId);

        if (!plan) {
            throw new Error('Server Error: Plan not found');
        }

        const ttlForExpirePayment = this.EXPIRE_IN_MINUTE * 60 * 1000;

        const timeExpireMilliseconds = new Date().getTime() + ttlForExpirePayment;

        const expireAt = new Date(timeExpireMilliseconds);

        const expireAtTimeZone = getCurrentDateInTimeZone(timeZone, expireAt);

        const price = parseFloat(plan.price as string);

        const currencyVND = convertUsdToVnd(price);

        const paymentData = {
            ...request,
            planId,
            amount: currencyVND,
            expireAt: expireAtTimeZone,
        };

        const paymentRegisterResponse = await sepayPayment.registerPaymentProcess(paymentData);

        if (!paymentRegisterResponse) {
            throw new Error('Server Error: Failed to create payment link');
        }

        const { orderCode, jobId } = paymentRegisterResponse;

        const transaction = await this.initTransactionPayment({
            gateway: GATEWAY.SEPAY,
            userId,
            amount: currencyVND,
            currency: 'VND',
            code: orderCode.toString(),
            paymentId: jobId,
            description: `Payment for plan ${plan.name}`,
            metadata: { planId, orderCode, jobId },
        });

        const redisKey = `${this.REDIS_PREFIX}:${userId}:${jobId}`;

        const dataStore = { planId, userId, expireAt: expireAtTimeZone, transactionId: transaction.transactionId };

        const plusTimeToTtlSecond = 10; // Adding 10 minute to the TTL to ensure the data is available for a short time after expiration
        const ttlCache = (this.EXPIRE_IN_MINUTE + plusTimeToTtlSecond) * 60;

        await redis.set(redisKey, dataStore, ttlCache);

        return {
            ...paymentRegisterResponse,
            expireAt: getDateFormattedWithTimeZone(expireAtTimeZone, timeZone),
            transactionId: transaction.transactionId,
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
            const transaction = await db
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

            return transaction[0];
        } catch (error) {
            logger.error(`Error initializing transaction payment: ${error}`);
            throw new DatabaseError('Failed to initialize transaction payment');
        }
    }

    /**
     * Handle webhook from PayOS gateway
     * @param webhookData - The webhook data from PayOS
     * @returns boolean indicating if webhook was processed successfully
     */
    public async handleWebhook(webhookData: WebhookRequest): Promise<boolean> {
        try {
            const { data, signature, success } = webhookData;

            // Verify webhook signature
            const isValidSignature = payOS.validateSignature(data, signature);

            if (!isValidSignature) {
                logger.error('Invalid webhook signature from PayOS');
                return false;
            }

            const { orderCode, amount, paymentLinkId } = data;

            // Find payment info in Redis using pattern matching

            const redisKey = `${this.REDIS_PREFIX}:${orderCode}:${paymentLinkId}`;
            // Get payment info from Redis
            const status = success ? PaymentStatus.PAID : PaymentStatus.CANCELLED;
            const paymentInfo = await redis.get(redisKey);

            if (!paymentInfo) {
                logger.warn(`Payment info expired for orderCode: ${orderCode}`);
                return false;
            }

            const { planId, userId } = paymentInfo;

            // Create payment status update
            const paymentUpdate: PaymentStatusUpdate = {
                userId,
                planId,
                orderCode,
                status: 'PAID',
                amount,
                timestamp: getCurrentDateInTimeZone().toISOString(),
            };

            //TODO: find key to matching webhook data and see
            // Send SSE event to user
            // const sseSuccess = sseManager.sendEvent(userId.toString(), {
            //     type: 'payment_status',
            //     data: paymentUpdate,
            // });

            // if (sseSuccess) {
            //     logger.info(`Payment status sent via SSE to user ${userId}: ${status}`);
            // }

            // Handle successful payment
            if (compareIgnoreCapitalization(status, PaymentStatus.PAID)) {
                await this.handleSuccessfulPayment(paymentUpdate);
            }

            // Clean up Redis data for completed/cancelled payments
            if (
                compareIgnoreCapitalization(status, PaymentStatus.PAID) ||
                compareIgnoreCapitalization(status, PaymentStatus.CANCELLED)
            ) {
                await redis.del(redisKey);
                logger.info(`Cleaned up payment data for orderCode: ${orderCode}`);
            }

            return true;
        } catch (error) {
            logger.error(`Error handling webhook: ${error}`);
            return false;
        }
    }

    /**
     * Handle successful payment processing
     * @param paymentUpdate - Payment status update data
     */
    private async handleSuccessfulPayment(paymentUpdate: PaymentStatusUpdate): Promise<void> {
        try {
            const { userId, planId } = paymentUpdate;

            // TODO: Implement subscription activation logic
            // - Update user subscription status
            // - Check and update status transaction

            // - Update database records
            logger.info(`Processing successful payment for user ${userId}, plan ${planId}`);

            //TODO: Send confirmation email
            // await emailService.sendPaymentConfirmation(userId);
        } catch (error) {
            logger.error(`Error processing successful payment: ${error}`);
            throw error;
        }
    }
}

export const paymentService = new PaymentService();
