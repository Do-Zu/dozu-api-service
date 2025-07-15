import PayOS from '@payos/node';
import { CheckoutRequestType } from '@payos/node/lib/type';
import { PaymentBase } from '../base/payment.base';
import { createHmac } from 'crypto';
import { PaymentData, PaymentDataType, PaymentLinkResponse, ValidationData } from '../type';

class PayOSManager extends PaymentBase {
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

    public isValidData(data: ValidationData, currentSignature: string): boolean {
        const dataToSignature = this.generateSignature(data);
        return dataToSignature === currentSignature;
    }

    /**
     * Create a payment link for the order data passed in the parameter
     */
    public async createPaymentLink(paymentData: PaymentDataType): Promise<PaymentLinkResponse> {
        const { planId } = paymentData;
        const orderCode = Math.floor(Math.random() * 10000000);
        const description = `PAYMENT SUBSCRIPTION PLAN`;

        const signature = this.generateSignature({
            ...paymentData,
            orderCode,
            description,
            returnUrl: this.BASE_URL_RETURN_SUCCESS,
            cancelUrl: this.BASE_URL_CANCEL,
        });

        const returnUrl = `${this.BASE_URL_RETURN_SUCCESS}?planId=${planId}`;
        const cancelUrl = `${this.BASE_URL_CANCEL}?planId=${planId}`;

        const payment: CheckoutRequestType = {
            ...paymentData,
            description,
            orderCode,
            returnUrl,
            cancelUrl,
            signature,
        };

        const dateResponse = await this.payOS.createPaymentLink(payment);

        return {
            ...dateResponse,
            baseUrlReturn: this.BASE_URL_RETURN,
        };
    }
}

export const payOS = new PayOSManager();
