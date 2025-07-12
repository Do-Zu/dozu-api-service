import { getCurrentDateInTimeZone } from '@/utils/date';
import planService from '../subscription/plan.service';
import { payOS } from './gateway/payos';
import { PaymentLinkRequest, PaymentLinkResponse } from './type';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { convertUsdToVnd } from '@/utils/conversion/conversion';

/**
 * Service class for Payment functionality
 */
class PaymentService {
    private readonly EXPIRE_IN_MINUTE = 5; // Expiration time for cache within 5 minutes
    private readonly REDIS_PREFIX = 'payment_register_info';
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

        const { bin, orderCode, paymentLinkId } = paymentRegisterResponse;
        const redisKey = `${this.REDIS_PREFIX}:${userId}:${bin}:${orderCode}:${paymentLinkId}`;
        const dataStore = { planId, userId, expireAt: expireAtTimeZone };

        const plusTimeToTtlSecond = 5; // Adding 5 seconds to the TTL to ensure the data is available for a short time after expiration
        const ttlCache = (this.EXPIRE_IN_MINUTE + plusTimeToTtlSecond) * 60;

        await redis.set(redisKey, dataStore, ttlCache);

        // this.syncToDatabase(paymentData);

        return paymentRegisterResponse;
    }

    // private syncToDatabase(paymentData: PaymentLinkRequest): void {
    //     // TODO
    //     // Here you would implement the logic to sync the payment data to your database.
    //     // This is a placeholder for the actual database interaction.
    //     console.log('Syncing payment data to database:', paymentData);
    // }

}

export const paymentService = new PaymentService();
