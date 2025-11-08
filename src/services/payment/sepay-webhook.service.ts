import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { transactionsModel } from '@/models/payment/transaction.model';
import { PaymentStatusUpdate } from '@/services/payment/type';
import { SepayPaymentMapping, SepayWebhookData } from '@/services/payment/type/sepay.type';
import { sseManager } from '@/services/sse/sse.service';
import subscriptionService from '@/services/subscription/subscription.service';
import { getCurrentDateInTimeZone } from '@/utils/date';
import { PaymentStatus } from './payment.interface';
import logger from '@/utils/logger';

/**
 * Service to handle SePay webhook processing
 */
class SepayWebhookService {
    private readonly REDIS_PREFIX = 'sepay_payment_mapping';
    private readonly REDIS_JOB_PREFIX = 'sepay_job_mapping';
    private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

    /**
     * Store payment mapping in Redis with jobId for SSE communication
     */
    public async storePaymentMapping(mapping: SepayPaymentMapping): Promise<boolean> {
        try {
            const { userId, planId, orderCode, amount, jobId, expireAt } = mapping;

            // Store payment mapping by orderCode
            const paymentKey = `${this.REDIS_PREFIX}:${orderCode}`;
            await redis.set(
                paymentKey,
                {
                    userId,
                    planId,
                    orderCode,
                    amount,
                    jobId,
                    createdAt: new Date().toISOString(),
                    expireAt,
                },
                this.DEFAULT_TTL
            );

            // Store jobId mapping for SSE lookup
            const jobKey = `${this.REDIS_JOB_PREFIX}:${userId}:${jobId}`;
            await redis.set(
                jobKey,
                {
                    orderCode,
                    userId,
                    planId,
                },
                this.DEFAULT_TTL
            );

            logger.info(`Stored SePay payment mapping for orderCode: ${orderCode}, jobId: ${jobId}`);
            return true;
        } catch (error) {
            logger.error(`Error storing SePay payment mapping: ${error}`);
            return false;
        }
    }

    /**
     * Handle incoming SePay webhook
     * @deprecated This webhook handler is being phased out in favor of PayOS
     */
    public async handleWebhook(webhookData: SepayWebhookData): Promise<boolean> {
        try {
            const {
                id: transactionId,
                transferAmount,
                content,
                transferType,
                gateway,
                transactionDate,
                accountNumber,
                referenceCode,
            } = webhookData;

            // Only process incoming transfers
            if (transferType !== 'in') {
                logger.info(`Ignoring outgoing transfer: ${transactionId}`);
                return true;
            }

            // HOW TO KOWN MAPPING BETWEEN ORDER CODE AND JOB ID?
            const orderCode = 0;
            // Find payment mapping in Redis
            const paymentKey = `${this.REDIS_PREFIX}:${orderCode}`;
            const mappingData = await redis.get(paymentKey);

            if (!mappingData) {
                logger.warn(`No payment mapping found for orderCode: ${orderCode}`);
                return false;
            }

            const mapping: SepayPaymentMapping = JSON.parse(mappingData);
            const { userId, planId, jobId, amount: expectedAmount } = mapping;

            // Verify amount (with some tolerance for currency conversion)
            const amountTolerance = 0.05; // 5% tolerance
            const amountDiff = Math.abs(transferAmount - expectedAmount) / expectedAmount;

            if (amountDiff > amountTolerance) {
                logger.warn(
                    `Amount mismatch for orderCode ${orderCode}. Expected: ${expectedAmount}, Received: ${transferAmount}`
                );
                // Don't return false here, just log the warning and continue
            }

            // Record transaction in database
            await this.recordTransaction({
                gateway: 'sepay',
                userId,
                amount: transferAmount,
                currency: 'VND',
                code: orderCode.toString(),
                paymentId: transactionId.toString(),
                description: content,
                metadata: {
                    sepayTransactionId: transactionId,
                    gateway,
                    accountNumber,
                    referenceCode,
                    transactionDate,
                },
            });

            // Create payment status update
            const paymentUpdate: PaymentStatusUpdate = {
                userId,
                planId,
                orderCode,
                status: PaymentStatus.SUCCESS,
                amount: transferAmount,
                paymentId: transactionId.toString(),
                timestamp: getCurrentDateInTimeZone(),
            };

            // Send SSE event to user via jobId
            const sseKeyIdentifier = `payment-sse-${userId}-${jobId}`;
            const sseSuccess = sseManager.sendEvent(sseKeyIdentifier, paymentUpdate);

            if (sseSuccess) {
                logger.info(`Payment status sent via SSE to user ${userId} with jobId ${jobId}`);
            } else {
                logger.warn(
                    `Failed to send SSE event to user ${userId} with jobId ${jobId} - client may not be connected`
                );

                // Also try the payment SSE manager as fallback
                sseManager.sendEvent(userId.toString(), {
                    type: 'payment_status',
                    data: paymentUpdate,
                });
            }

            // Update subscription
            await this.handleSuccessfulPayment(paymentUpdate);

            // Clean up Redis data
            await redis.del(paymentKey);
            const jobKey = `${this.REDIS_JOB_PREFIX}:${userId}:${jobId}`;
            await redis.del(jobKey);

            logger.info(
                `Successfully processed SePay webhook for orderCode: ${orderCode}, transactionId: ${transactionId}`
            );
            return true;
        } catch (error) {
            logger.error(`Error processing SePay webhook: ${error}`);
            return false;
        }
    }

    /**
     * Record transaction in database
     */
    private async recordTransaction(transactionData: {
        gateway: string;
        userId: number;
        amount: number;
        currency: string;
        code?: string;
        paymentId?: string;
        description?: string;
        metadata?: object;
    }): Promise<void> {
        try {
            await db.insert(transactionsModel).values({
                userId: transactionData.userId,
                gateway: transactionData.gateway,
                amount: transactionData.amount.toString(),
                currency: transactionData.currency,
                status: 'success',
                code: transactionData.code,
                paymentId: transactionData.paymentId,
                description: transactionData.description,
                metadata: transactionData.metadata,
            });

            logger.info(`Transaction recorded for SePay payment: ${transactionData.paymentId}`);
        } catch (error) {
            logger.error(`Error recording transaction: ${error}`);
            // Don't throw error here as webhook processing should continue
        }
    }

    /**
     * Handle successful payment processing
     */
    private async handleSuccessfulPayment(paymentUpdate: PaymentStatusUpdate): Promise<void> {
        try {
            const { userId, planId } = paymentUpdate;

            // Update user subscription
            await subscriptionService.changeSubscription({
                userId,
                newPlanId: planId,
                timeZone: 'UTC',
            });

            logger.info(`Successfully updated subscription for user ${userId} to plan ${planId}`);
        } catch (error) {
            logger.error(`Error updating subscription after SePay payment: ${error}`);
            throw error;
        }
    }

    /**
     * Get payment mapping by orderCode
     */
    public async getPaymentMapping(orderCode: number): Promise<SepayPaymentMapping | null> {
        try {
            const paymentKey = `${this.REDIS_PREFIX}:${orderCode}`;
            const mappingData = await redis.get(paymentKey);

            if (!mappingData) {
                return null;
            }

            return JSON.parse(mappingData);
        } catch (error) {
            logger.error(`Error getting payment mapping: ${error}`);
            return null;
        }
    }

    /**
     * Get jobId by orderCode for SSE communication
     */
    public async getJobIdByOrderCode(orderCode: number): Promise<string | null> {
        try {
            const mapping = await this.getPaymentMapping(orderCode);
            return mapping?.jobId || null;
        } catch (error) {
            logger.error(`Error getting jobId for orderCode ${orderCode}: ${error}`);
            return null;
        }
    }
}

export const sepayWebhookService = new SepayWebhookService();
