import PayOS from '@payos/node';
import { CheckoutRequestType } from '@payos/node/lib/type';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentBase } from '../base/payment.base';
import { PaymentGateway } from '../payment.interface';
import { PaymentData, PaymentDataType, PaymentLinkResponse, ValidationData } from '../type';
import { InternalServerError } from '@/core/error';
import logger from '@/utils/logger';
import { toNumber } from '@/utils/common';
import { getSystemDate } from '@/utils/date';

class PayOSManager extends PaymentBase implements PaymentGateway {
    private readonly clientId: string;
    private readonly apiKey: string;
    private readonly checksumKey: string;
    private payOS: PayOS;

    constructor() {
        super();

        this.clientId = process.env.PAY_OS_CLIENT_ID || '';
        this.apiKey = process.env.PAY_OS_API_KEY || '';
        this.checksumKey = process.env.PAY_OS_CHECKSUM_KEY || '';

        this.payOS = this.initialize();
    }

    public async createPayment(paymentData: PaymentDataType): Promise<PaymentLinkResponse> {
        return await this.createPaymentLink(paymentData);
    }

    public async getPaymentStatus({ transactionId }: { transactionId: string }): Promise<unknown> {
        console.log(`Getting payment status for transaction ID: ${transactionId}`);
        throw new Error('Method not implemented.');
    }

    public async handleWebhook(payload: unknown): Promise<unknown> {
        console.log(payload);
        throw new Error('Method not implemented.');
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
            };
        } catch (error) {
            logger.error('Failed to create PayOS payment link', { error, orderCode });
            throw new InternalServerError('Plain External Register Payment Process Fail');
        }
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
        const timestampPart = getSystemDate().toString().slice(-10);
        const randomPart = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return toNumber(timestampPart + randomPart);
    }
}

export const payOS = new PayOSManager();
