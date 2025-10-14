import { Forbidden } from '@/core/error';
import { isNilOrEmpty } from '@/utils/common';

export abstract class PaymentBase {
    protected BASE_URL_RETURN_SUCCESS: string;
    protected BASE_URL_CANCEL: string;
    protected FRONTEND_BASE_URL: string;
    protected readonly BASE_URL_RETURN: string = '/payment';

    constructor() {
        const { envFrontendBaseUrl } = this.initializeBase();

        this.FRONTEND_BASE_URL = envFrontendBaseUrl;
        this.BASE_URL_RETURN_SUCCESS = `${this.FRONTEND_BASE_URL}${this.BASE_URL_RETURN}`;
        this.BASE_URL_CANCEL = `${this.FRONTEND_BASE_URL}${this.BASE_URL_RETURN}`;
    }

    private initializeBase() {
        const envFrontendBaseUrl = process.env.FRONTEND_BASE_URL;

        if (!envFrontendBaseUrl) {
            throw new Error('PaymentBase configuration is not set properly');
        }

        return {
            envFrontendBaseUrl,
        };
    }

    protected cleanAmount(amount: unknown): number {
        if (isNilOrEmpty(amount)) {
            throw new Forbidden('Invalid payment amount');
        }
        const normalized =
            typeof amount === 'bigint'
                ? Number(amount)
                : typeof amount === 'string'
                  ? Number(amount.trim())
                  : Number(amount);

        if (!Number.isFinite(normalized)) throw new Forbidden('Invalid payment amount: not a number');

        if (normalized <= 0) {
            throw new Forbidden('Invalid payment amount: must be greater than zero');
        }

        return normalized;
    }
}
