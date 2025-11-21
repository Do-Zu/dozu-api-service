import { z } from 'zod';

// Plan DTOs
export const createPlanSchema = z.object({
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(100),
    description: z.string().optional(),
    planType: z.enum(['free', 'normal', 'pro', 'team', 'enterprise']),
    billingInterval: z.enum(['monthly', 'yearly', 'lifetime']),
    price: z.number().min(0),
    currency: z.string().length(3).default('USD'),
    isActive: z.boolean().default(true),
    isPopular: z.boolean().default(false),
    sortOrder: z.number().default(0),
    metadata: z.record(z.any()).optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;

// Feature DTOs
export const createFeatureSchema = z.object({
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(100),
    description: z.string().optional(),
    featureType: z.enum(['boolean', 'quota', 'size_limit', 'rate_limit', 'text', 'json']),
    category: z.enum(['core', 'storage', 'api', 'collaboration', 'support', 'analytics', 'customization']),
    unit: z.string().max(50).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().default(0),
    metadata: z.record(z.any()).optional(),
});

export const updateFeatureSchema = createFeatureSchema.partial();

export type CreateFeatureDto = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureDto = z.infer<typeof updateFeatureSchema>;

// Plan Feature DTOs
export const createPlanFeatureSchema = z.object({
    planId: z.number().positive(),
    featureId: z.number().positive(),
    booleanValue: z.boolean().optional(),
    numericValue: z.number().optional(),
    textValue: z.string().optional(),
    jsonValue: z.record(z.any()).optional(),
    isUnlimited: z.boolean().default(false),
    isEnabled: z.boolean().default(true),
    metadata: z.record(z.any()).optional(),
});

export const updatePlanFeatureSchema = createPlanFeatureSchema.partial().omit({
    planId: true,
    featureId: true,
});

export type CreatePlanFeatureDto = z.infer<typeof createPlanFeatureSchema>;
export type UpdatePlanFeatureDto = z.infer<typeof updatePlanFeatureSchema>;

// Subscription DTOs
export const createSubscriptionSchema = z.object({
    planId: z.number().positive().or(z.string().min(1)), // Allow both number and string for planId
    paymentMethod: z.string().optional(),
    externalSubscriptionId: z.string().optional(),
    code: z.string().optional(),
});

export const upgradeSubscriptionSchema = z.object({
    planId: z.number().positive().or(z.string().min(1)),
    paymentMethod: z.string().optional(),
    paymentId: z.string(),
    externalSubscriptionId: z.string().optional(),
    orderCode: z.string(),
    autoRenew: z.boolean().optional(),
    paymentData: z.record(z.any()).optional(),
});

export const updateSubscriptionSchema = z.object({
    status: z.enum(['active', 'cancelled', 'expired', 'pending', 'suspended', 'trialing']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
    subscriptionId: z.number().positive().or(z.string().min(1)),
    cancelAt: z.string().datetime().optional(),
    cancellationReason: z.string().optional(),
    autoRenew: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
});

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;

export const applyCouponSchema = z.object({
    code: z.string().min(1),
    planId: z.number().positive().optional(),
});

// Feature Usage DTOs
export const recordFeatureUsageSchema = z.object({
    featureName: z.string(),
    usageAmount: z.number().positive().default(1),
});

export const checkFeatureUsageSchema = z.object({
    featureName: z.string(),
    requestedAmount: z.number().positive().default(1),
});

export type RecordFeatureUsageDto = z.infer<typeof recordFeatureUsageSchema>;
export type CheckFeatureUsageDto = z.infer<typeof checkFeatureUsageSchema>;

// Billing DTOs
export const createBillingRecordSchema = z.object({
    subscriptionId: z.number().positive().optional(),
    type: z.enum(['payment', 'refund', 'credit', 'adjustment', 'bonus']),
    amount: z.number(),
    currency: z.string().length(3).default('USD'),
    description: z.string().optional(),
    invoiceNumber: z.string().optional(),
    externalTransactionId: z.string().optional(),
    paymentMethod: z.string().optional(),
    paymentProvider: z.string().optional(),
    billingPeriodStart: z.string().datetime().optional(),
    billingPeriodEnd: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional(),
});

export type CreateBillingRecordDto = z.infer<typeof createBillingRecordSchema>;

// Query DTOs
export const subscriptionQuerySchema = z.object({
    status: z.enum(['active', 'cancelled', 'expired', 'pending', 'suspended', 'trialing']).optional(),
    page: z.number().positive().default(1),
    limit: z.number().positive().max(100).default(20),
});

export const billingHistoryQuerySchema = z.object({
    type: z.enum(['payment', 'refund', 'credit', 'adjustment', 'bonus']).optional(),
    status: z.enum(['pending', 'completed', 'failed', 'cancelled', 'refunded']).optional(),
    page: z.number().positive().default(1),
    limit: z.number().positive().max(100).default(20),
});

export type SubscriptionQueryDto = z.infer<typeof subscriptionQuerySchema>;
export type BillingHistoryQueryDto = z.infer<typeof billingHistoryQuerySchema>;
