/**
 * Subscription middleware types and interfaces
 * Following Interface Segregation Principle (ISP)
 */

export interface ISubscriptionContext {
    userId: number;
    timezone: string;
    today: string;
}

export interface IFeatureLimitContext extends ISubscriptionContext {
    featureId: number;
    planId: number;
    subscriptionId?: number;
}

export interface IUserPlan {
    plan: IPlan | null;
    subscription: ISubscription | null;
}

export interface IPlan {
    planId: number;
    planType: string;
}

export interface ISubscription {
    subscriptionId: number;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
}

import { IFeatureUsageInterval } from '@/models/subscription';

export interface IPlanFeature {
    featureType: string;
    numericValue: string | null;
    isEnabled: boolean;
    interval: IFeatureUsageInterval;
}

export interface IRenewalResult {
    newPeriodStart: Date;
    newPeriodEnd: Date;
}

export interface ITimeValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

export interface ISubscriptionValidationResult {
    isExpired: boolean;
    userPlan: IUserPlan;
}

export interface IFeatureLimitResult {
    exceeded: boolean;
}
