import { AuthenticationError, BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { payOS } from '@/services/payment/gateway/payos';
import { paymentService } from '@/services/payment/payment.service';
import { sepayWebhookService } from '@/services/payment/sepay-webhook.service';
import { WebhookRequest } from '@/services/payment/type';
import { SepayWebhookData } from '@/services/payment/type/sepay.type';
import { sseManager } from '@/services/sse/sse.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getTimezoneClient } from '@/utils/date';
import logger from '@/utils/logger';
import { Request, Response } from 'express';

export const PREFIX_KEY_SSE_SEPAY = 'PAYMENT-SEPAY-SSE-WEBHOOK';
/**
 * Controller class for Payment functionality
 */
class PaymentController {
    async createLinkPaymentWithPayOS(req: Request, res: Response) {
        if (!req.currentUser) {
            throw new AuthenticationError('Login information is invalid');
        }
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
            timeZone,
        });

        SuccessResponse.created(res, paymentLink);
    }

    // async createLinkPaymentWithSepay(req: Request, res: Response) {
    //     if (!req.currentUser) {
    //         throw new AuthenticationError('Login information is invalid');
    //     }
    //     const userId = req.currentUser.userId;
    //     const timeZone = getTimezoneClient(req);
    //     const paymentData = req.body;

    //     if (!paymentData || !paymentData?.planId) {
    //         throw new BadRequest('Invalid payment data!');
    //     }

    //     const planId = parseInt(paymentData.planId.toString());

    //     const paymentLink = await paymentService.createPaymentLinkWithSepay({
    //         ...paymentData,
    //         userId,
    //         planId,
    //         timeZone,
    //     });

    //     SuccessResponse.created(res, paymentLink);
    // }

    /**
     * Handle webhook from PayOS gateway
     */
    async handleWebhookPayOS(req: Request, res: Response) {
        try {
            const webhookData: WebhookRequest = req.body;

            if (!webhookData || !webhookData.data || !webhookData.signature) {
                throw new BadRequest('Invalid webhook data');
            }

            const success = await payOS.handleWebhook(webhookData);

            if (success) {
                logger.info(`Webhook processed successfully for order: ${webhookData.data.orderCode}`);
                res.status(200).json({ success: true });
            } else {
                logger.error(`Failed to process webhook for order: ${webhookData.data.orderCode}`);
                res.status(400).json({ success: false, message: 'Failed to process webhook' });
            }
        } catch (error) {
            logger.error(`Webhook error: ${error}`);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Handle webhook from Sepay gateway
     */
    async handleWebhookSepay(req: Request, res: Response) {
        try {
            const webhookData: SepayWebhookData = req.body;

            // Validate webhook data structure
            if (!webhookData || typeof webhookData.id !== 'number' || !webhookData.transferAmount) {
                logger.warn('Invalid SePay webhook data structure', { body: req.body });
                throw new BadRequest('Invalid webhook data structure');
            }

            // Log incoming webhook for debugging
            logger.info(
                `SePay webhook received: Transaction ID ${webhookData.id}, Amount: ${webhookData.transferAmount}, Type: ${webhookData.transferType}`
            );

            const success = await sepayWebhookService.handleWebhook(webhookData);

            if (success) {
                logger.info(`SePay webhook processed successfully for transaction: ${webhookData.id}`);
                res.status(200).json({ success: true, message: 'Webhook processed successfully' });
            } else {
                logger.error(`Failed to process SePay webhook for transaction: ${webhookData.id}`);
                res.status(400).json({ success: false, message: 'Failed to process webhook' });
            }
        } catch (error) {
            logger.error(`SePay webhook error: ${error}`, { body: req.body });
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Establish SSE connection for payment status updates
     */
    async connectPaymentSSE(req: Request, res: Response) {
        const jobId = req.params.jobId;

        if (!jobId) {
            throw new BadRequest('Job ID is required for SSE connection');
        }

        const keyIdentifier = `${PREFIX_KEY_SSE_SEPAY}-${jobId}`;

        // Add client to payment SSE manager
        sseManager.addClient(keyIdentifier, res);
    }

    /**
     * Update status of transaction for payment subscription
     */
    public async updateTransactionStatus(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);

        const timezone = getTimezoneClient(req);

        const { orderCode, paymentId } = req.body;

        const transaction = await paymentService.updateTransactionStatus({ userId, timezone, orderCode, paymentId });

        SuccessResponse.ok(res, transaction);
    }
}

export const paymentController = new PaymentController();
