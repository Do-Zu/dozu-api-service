import { Request, Response } from 'express';
import { paymentService } from '@/services/payment/payment.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { getTimezoneClient } from '@/utils/date';

/**
 * Controller class for Payment functionality
 */
class PaymentController {
    async createLinkPaymentWithPayOS(req: Request, res: Response) {
        const userId = req.currentUser.userId;
        const timeZone = getTimezoneClient(req);
        const paymentData = req.body;

        if (!paymentData || !paymentData?.planId) {
            throw new BadRequest('Invalid payment data!');
        }

        const planId = parseInt(paymentData.planId.toString());

        const paymentLink = await paymentService.createPaymentLinkWithPayOS({
            ...paymentData,
            userId,
            planId,
            timeZone
        });

        SuccessResponse.created(res, paymentLink);
    }
}

export const paymentController = new PaymentController();
