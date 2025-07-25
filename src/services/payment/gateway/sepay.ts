import planService from '@/services/subscription/plan.service';
import { convertUsdToVnd } from '@/utils/conversion/conversion';
import { getCurrentDateInTimeZone, getSystemDate } from '@/utils/date';
import { addMilliseconds } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { IPaymentResponseSePayRegister, PaymentLinkRequest } from '../type';
import { removeHyphensFromUUID } from '@/utils/common';

class SepayPayment {
    private readonly LINK_BASE_QR = 'https://qr.sepay.vn/img?acc=VQRQADHMU4768&bank=MBBank';

    public async registerPaymentProcess(paymentData: PaymentLinkRequest): Promise<IPaymentResponseSePayRegister> {
        const { planId, timeZone, userId } = paymentData;

        const plan = await planService.getPlanById(planId);

        if (!plan) {
            throw new Error('Server Error: Plan not found');
        }

        const ttlForExpirePayment = 60 * 60 * 1000; // 1 hour
        const expireAt = addMilliseconds(getSystemDate(), ttlForExpirePayment);
        const expireAtTimeZone = getCurrentDateInTimeZone(timeZone, expireAt).toISOString();

        const price = parseFloat(plan.price as string);
        const currencyVND = convertUsdToVnd(price);
        const jobId = removeHyphensFromUUID(uuidv4());

        const orderCode = this.generateOrderCode();
        const description = `ORDER:${orderCode};JOB:${jobId};USER:${userId}`;
        const encodedDescription = encodeURIComponent(description);
        const qrCodeUrl = `${this.LINK_BASE_QR}&amount=${currencyVND}&des=${encodedDescription}`;

        const paymentDataWithDetails: IPaymentResponseSePayRegister = {
            amount: currencyVND,
            currency: 'VND',
            orderCode,
            qrCode: qrCodeUrl,
            expireAt: expireAtTimeZone,
            jobId,
        };

        return paymentDataWithDetails;
    }

    /**
     * Generates an order code with prefix "DZ" followed by 10-30 random alphanumeric characters
     * @param length - Length of the suffix (10-30 characters)
     * @returns Order code string (e.g., "DZA1B2C3D4E5F6G7H8I9J0")
     */
    private generateOrderCode(length: number = 20): string {
        // Ensure length is within the specified range
        const suffixLength = Math.max(10, Math.min(30, length));

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let suffix = '';

        for (let i = 0; i < suffixLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            suffix += characters[randomIndex];
        }

        return `DZ${suffix}`;
    }
}

export const sepayPayment = new SepayPayment();
