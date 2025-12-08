export interface PaymentWebhookResponse {
    code: string;
    desc: string;
    success: boolean;
    data: {
        orderCode: number;
        amount: number;
        description: string;
        accountNumber: string;
        reference: string;
        transactionDateTime: string;
        currency: string;
        paymentLinkId: string;
        code: string;
        desc: string;
        counterAccountBankId: string;
        counterAccountBankName: string;
        counterAccountName: string;
        counterAccountNumber: string;
        virtualAccountName: string;
        virtualAccountNumber: string;
    };
    signature: string;
}

export interface IMetaDataTransaction {
    planId: number;
    orderCode: number;
    jobId: string;
}
