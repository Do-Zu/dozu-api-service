import { Request, Response } from 'express';
import { adminRevenueService } from '@/services/admin/revenue.service';
import { SuccessResponse } from '@/core/success';
import { getRevenueStatsQuerySchema, getRevenueBreakdownQuerySchema } from '@/dtos/admin/revenue.dto';

class AdminRevenueController {
    async getRevenueStats(req: Request, res: Response) {
        const validatedQuery = getRevenueStatsQuerySchema.parse(req.query);
        const stats = await adminRevenueService.getRevenueStats(validatedQuery);
        SuccessResponse.ok(res, stats, 'Revenue statistics retrieved successfully');
    }

    async getRevenueBreakdown(req: Request, res: Response) {
        const validatedQuery = getRevenueBreakdownQuerySchema.parse(req.query);
        const breakdown = await adminRevenueService.getRevenueBreakdown(validatedQuery);
        SuccessResponse.ok(res, breakdown, 'Revenue breakdown retrieved successfully');
    }

    async getTopCustomers(req: Request, res: Response) {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const customers = await adminRevenueService.getTopCustomers(limit);
        SuccessResponse.ok(res, customers, 'Top customers retrieved successfully');
    }
}

export const adminRevenueController = new AdminRevenueController();

