import { CheckoutRequestType, CheckoutResponseDataType } from "@payos/node/lib/type";

export interface PaymentDataType extends Omit<CheckoutRequestType, 'returnUrl' | 'cancelUrl' | 'orderCode' | 'description'> {
    planId: number;
}

export interface PaymentData {
    [key: string]: string | number | boolean | null | undefined | PaymentData[] | PaymentData | ValidationData;
}

export interface ValidationData {
    [key: string]: any;
}

export interface PaymentLinkResponse extends CheckoutResponseDataType {
    baseUrlReturn: string;
}

export interface PaymentLinkRequest extends PaymentDataType {
    planId: number;
    userId: number;
    timeZone: string;
}


