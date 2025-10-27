import { z } from 'zod';

export const getSubscriptionStatsQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const getSubscriptionsQuerySchema = z.object({
    status: z.enum(['active', 'cancelled', 'expired', 'pending', 'suspended', 'trialing']).optional(),
    planType: z.enum(['free', 'pro']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
});

export type GetSubscriptionStatsQueryDto = z.infer<typeof getSubscriptionStatsQuerySchema>;
export type GetSubscriptionsQueryDto = z.infer<typeof getSubscriptionsQuerySchema>;

