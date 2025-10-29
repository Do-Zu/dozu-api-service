import { z } from 'zod';

export const getRevenueStatsQuerySchema = z.object({
    period: z.enum(['day', 'week', 'month', 'year']).default('month'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const getRevenueBreakdownQuerySchema = z.object({
    groupBy: z.enum(['plan', 'gateway', 'period']).default('plan'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export type GetRevenueStatsQueryDto = z.infer<typeof getRevenueStatsQuerySchema>;
export type GetRevenueBreakdownQueryDto = z.infer<typeof getRevenueBreakdownQuerySchema>;

