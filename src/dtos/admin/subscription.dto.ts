import { z } from 'zod';

// Plan management DTOs
export const createPlanSchema = z.object({
    name: z.string().min(1, 'Plan name is required'),
    description: z.string().optional(),
    planType: z.enum(['free', 'pro']),
    billingInterval: z.enum(['monthly', 'yearly', 'custom']),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
    currency: z.string().length(3).default('USD'),
    isActive: z.boolean().default(true),
});

export const updatePlanSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    isActive: z.boolean().optional(),
});

export const togglePlanActiveSchema = z.object({
    isActive: z.boolean(),
});

// Feature management DTOs
export const createFeatureSchema = z.object({
    name: z.string().min(1, 'Feature name is required'),
    description: z.string().optional(),
    featureType: z.enum(['boolean', 'usage', 'size_limit']),
    category: z.enum(['core', 'storage', 'integrations', 'customization']),
    unit: z.enum(['GB', 'MB', 'count']).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});

export const updateFeatureSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

// Plan Feature mapping DTOs
export const assignFeatureToPlanSchema = z.object({
    planId: z.number().int().positive(),
    featureId: z.number().int().positive(),
    booleanValue: z.boolean().optional(),
    numericValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    textValue: z.string().optional(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'lifetime']).default('daily'),
    apiUrl: z.string().url('Invalid API URL'),
    isUnlimited: z.boolean().default(false),
    isEnabled: z.boolean().default(true),
});

export const updatePlanFeatureSchema = z.object({
    booleanValue: z.boolean().optional(),
    numericValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    textValue: z.string().optional(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'lifetime']).optional(),
    apiUrl: z.string().url().optional(),
    isUnlimited: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
});

export const bulkUpdatePlanFeaturesSchema = z.object({
    planId: z.number().int().positive(),
    features: z.array(
        z.object({
            featureId: z.number().int().positive(),
            booleanValue: z.boolean().optional(),
            numericValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
            textValue: z.string().optional(),
            interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'lifetime']).default('daily'),
            apiUrl: z.string().url(),
            isUnlimited: z.boolean().default(false),
            isEnabled: z.boolean().default(true),
        })
    ),
});

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
export type TogglePlanActiveDto = z.infer<typeof togglePlanActiveSchema>;
export type CreateFeatureDto = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureDto = z.infer<typeof updateFeatureSchema>;
export type AssignFeatureToPlanDto = z.infer<typeof assignFeatureToPlanSchema>;
export type UpdatePlanFeatureDto = z.infer<typeof updatePlanFeatureSchema>;
export type BulkUpdatePlanFeaturesDto = z.infer<typeof bulkUpdatePlanFeaturesSchema>;

