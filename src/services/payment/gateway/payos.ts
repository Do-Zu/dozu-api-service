import PayOS from '@payos/node';
import { CheckoutRequestType } from '@payos/node/lib/type';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentBase } from '../base/payment.base';
import { PaymentGateway, PaymentStatus } from '../payment.interface';
import {
    PaymentData,
    PaymentDataType,
    PaymentLinkResponse,
    PaymentStatusUpdate,
    ValidationData,
    WebhookRequest,
} from '../type';
import { InternalServerError } from '@/core/error';
import logger from '@/utils/logger';
import { compareIgnoreCapitalization, toNumber } from '@/utils/common';
import { getCurrentDateInTimeZone, getSystemDate, TIME_ZONE_SYSTEM } from '@/utils/date';
import { redis } from '@/libs/redis/redis.connect';
import { paymentService, REDIS_PREFIX_PAYMENT_GATEWAY_INFO } from '../payment.service';

import { IMetaDataTransaction } from '../type/payos.type';
import subscriptionService from '@/services/subscription/subscription.service';

class PayOSManager extends PaymentBase implements PaymentGateway {
    private readonly clientId: string;
    private readonly apiKey: string;
    private readonly checksumKey: string;
    private readonly REDIS_PREFIX = REDIS_PREFIX_PAYMENT_GATEWAY_INFO;
    private payOS: PayOS;

    constructor() {
        super();

        this.clientId = process.env.PAY_OS_CLIENT_ID || '';
        this.apiKey = process.env.PAY_OS_API_KEY || '';
        this.checksumKey = process.env.PAY_OS_CHECKSUM_KEY || '';

        this.payOS = this.initialize();
    }

    private initialize() {
        if (!this.clientId || !this.apiKey || !this.checksumKey) {
            throw new Error('PayOSManager configuration is not set properly');
        }

        return this.payOSInstance();
    }

    private payOSInstance(): PayOS {
        if (!this.payOS) {
            this.payOS = new PayOS(this.clientId, this.apiKey, this.checksumKey);
        }
        return this.payOS;
    }

    public async createPayment(paymentData: PaymentDataType): Promise<PaymentLinkResponse> {
        return await this.createPaymentLink(paymentData);
    }

    public async getPaymentStatus({ transactionId }: { transactionId: string }): Promise<unknown> {
        console.log(`Getting payment status for transaction ID: ${transactionId}`);
        throw new Error('Method not implemented.');
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
            const status = success ? PaymentStatus.SUCCESS : PaymentStatus.CANCELLED;

            const existing = await paymentService.getTransactionOfGateway({
                orderCode,
                paymentId: paymentLinkId,
            });

            if (!existing) {
                logger.warn(
                    `WEB HOOK PAYOS: transaction not found for orderCode=${orderCode}, paymentId=${paymentLinkId}`
                );

                return true;
            }

            if (compareIgnoreCapitalization(existing.status, PaymentStatus.PENDING)) {
                logger.info(
                    `WEB HOOK PAYOS: Transaction exceed lifecycle for transactionId=${existing.transactionId}, skipping`
                );
                return true;
            }

            const { userId, metadata } = existing;

            const planIdPayment = (metadata as IMetaDataTransaction).planId;

            // Create payment status update
            const paymentUpdate: PaymentStatusUpdate = {
                userId: userId,
                planId: planIdPayment,
                orderCode,
                paymentId: paymentLinkId,
                status: PaymentStatus.SUCCESS,
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

            if (
                compareIgnoreCapitalization(status, PaymentStatus.SUCCESS) ||
                compareIgnoreCapitalization(status, PaymentStatus.CANCELLED)
            ) {
                await redis.del(redisKey);
                logger.info(`Cleaned up payment data for orderCode: ${orderCode}`);
            }

            // Handle successful payment
            if (compareIgnoreCapitalization(status, PaymentStatus.SUCCESS)) {
                return await this.handleSuccessfulPayment(paymentUpdate);
            }

            // Clean up Redis data for completed/cancelled payments

            return true;
        } catch (error) {
            logger.error(`Error handling webhook: ${error}`);
            throw new InternalServerError();
        }
    }

    /**
     * Handle successful payment processing
     * @param paymentUpdate - Payment status update data
     */
    private async handleSuccessfulPayment(paymentUpdate: PaymentStatusUpdate): Promise<boolean> {
        try {
            const { userId, planId: planIdPayment, paymentId, orderCode } = paymentUpdate;

            //Check current subscription of user
            const subscription = await subscriptionService.getUserActiveSubscription(userId);

            if (subscription && subscription?.planId === planIdPayment) {
                return true;
            }

            // Update user subscription status
            // Check and update status transaction
            try {
                await paymentService.updateTransactionStatus({
                    userId,
                    orderCode,
                    paymentId,
                    timezone: TIME_ZONE_SYSTEM.UTC,
                });
            } catch (error) {
                // Skip server error and must upgrade subscription
                if (!(error instanceof InternalServerError)) {
                    logger.error(error);
                    // When transaction already not status pending -> transaction completed -> throw error for user
                    throw error;
                }
            }

            // If not upgrade , upgrade subscription for user based on planId register when payment
            await subscriptionService.changeSubscription({
                userId,
                newPlanId: planIdPayment,
                timeZone: TIME_ZONE_SYSTEM.UTC,
            });

            //TODO: Send confirmation email
            //await emailService.sendPaymentConfirmation(userId);

            return true;
        } catch (error) {
            logger.error(`Error processing successful payment: ${error}`);
            throw error;
        }
    }

    /**
     *
     * @param data
     * @param currentSignature
     * @returns
     */
    public validateSignature(data: ValidationData, currentSignature: string): boolean {
        const dataToSignature = this.generateSignature(data);
        return dataToSignature === currentSignature;
    }

    /**
     * Setup webhook URL for PayOS
     * @param webhookUrl - The webhook URL to register
     */
    public async setupWebhook(webhookUrl: string): Promise<boolean> {
        try {
            const response = await this.payOS.confirmWebhook(webhookUrl);
            return !!response;
        } catch (error) {
            logger.error('Failed to setup webhook:', error);
            return false;
        }
    }

    /**
     * Create a payment link for the order data passed in the parameter
     */
    public async createPaymentLink(paymentData: PaymentDataType): Promise<PaymentLinkResponse> {
        const { planId } = paymentData;
        const orderCode = this.generateOrderCode();
        const description = `PAYMENT SUBSCRIPTION PLAN`;

        const signature = this.generateSignature({
            ...paymentData,
            orderCode,
            description,
            returnUrl: this.BASE_URL_RETURN_SUCCESS,
            cancelUrl: this.BASE_URL_CANCEL,
        });

        const jobId = uuidv4();
        const returnUrl = `${this.BASE_URL_RETURN_SUCCESS}?planId=${planId}&jobId=${jobId}`;
        const cancelUrl = `${this.BASE_URL_CANCEL}?planId=${planId}&jobId=${jobId}`;

        const amount = this.cleanAmount(paymentData?.amount);

        const payment: CheckoutRequestType = {
            amount,
            description,
            orderCode,
            returnUrl,
            cancelUrl,
            signature,
        };

        try {
            const dataResponse = await this.payOS.createPaymentLink(payment);
            return {
                ...dataResponse,
                baseUrlReturn: this.BASE_URL_RETURN,
                jobId,
                apiCheckStatus: this.getApiCheckStatus(dataResponse?.paymentLinkId),
            };
        } catch (error) {
            logger.error('Failed to create PayOS payment link', { error, orderCode });
            throw new InternalServerError('Plain External Register Payment Process Fail');
        }
    }

    private getApiCheckStatus(paymentId: string): string {
        return `https://pay.payos.vn/api/web/${paymentId}/check-status/`;
    }

    private generateSignature(data: ValidationData): string {
        const sortedDataByKey = this.sortObjDataByKey(data);
        const dataQueryStr = this.convertObjToQueryStr(sortedDataByKey);
        return createHmac('sha256', this.checksumKey).update(dataQueryStr).digest('hex');
    }

    private convertObjToQueryStr(object: PaymentData): string {
        return Object.keys(object)
            .filter(key => object[key] !== undefined)
            .map(key => {
                let value = object[key];
                // Sort nested object
                if (value && Array.isArray(value)) {
                    value = JSON.stringify(value.map(val => this.sortObjDataByKey(val as PaymentData)));
                }
                // Set empty string if null
                if ([null, undefined, 'undefined', 'null'].includes(value as any)) {
                    value = '';
                }

                return `${key}=${value}`;
            })
            .join('&');
    }

    private sortObjDataByKey(object: PaymentData): PaymentData {
        const orderedObject = Object.keys(object)
            .sort()
            .reduce((obj: PaymentData, key: string) => {
                obj[key] = object[key];
                return obj;
            }, {});
        return orderedObject;
    }

    /**
     * Generates a numeric order code with very low collision chance.
     * Uses timestamp + random part (max 15 digits total).
     *
     * Example: 1730612345123
     */
    private generateOrderCode(): number {
        const timestampPart = getSystemDate().getTime().toString().slice(-10);
        const randomPart = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return toNumber(timestampPart + randomPart);
    }
}

export const payOS = new PayOSManager();
