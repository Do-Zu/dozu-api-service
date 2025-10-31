import db from '@/libs/drizzleClient.lib';
import { eq, and, gte, lte, sql, count, sum, desc } from 'drizzle-orm';
import { transactionsModel } from '@/models/payment/transaction.model';
import { userSubscriptionsTable, plansTable } from '@/models/subscription';
import { usersTable } from '@/models/user.model';
import { GetRevenueStatsQueryDto, GetRevenueBreakdownQueryDto } from '@/dtos/admin/revenue.dto';

class AdminRevenueService {
    // ============ REVENUE STATISTICS ============

    async getRevenueStats(filters: GetRevenueStatsQueryDto) {
        const { period = 'month', startDate, endDate } = filters;

        // Set date range
        const now = new Date();
        let start: Date;
        let end: Date = endDate ? new Date(endDate) : now;

        if (startDate) {
            start = new Date(startDate);
        } else {
            // Default ranges based on period
            start = new Date(now);
            switch (period) {
                case 'day':
                    start.setDate(start.getDate() - 30); // Last 30 days
                    break;
                case 'week':
                    start.setDate(start.getDate() - 12 * 7); // Last 12 weeks
                    break;
                case 'month':
                    start.setMonth(start.getMonth() - 12); // Last 12 months
                    break;
                case 'year':
                    start.setFullYear(start.getFullYear() - 5); // Last 5 years
                    break;
            }
        }

        // Get successful transactions
        const conditions = [
            eq(transactionsModel.status, 'success'),
            gte(transactionsModel.transactionDate, start),
            lte(transactionsModel.transactionDate, end),
        ];

        // Calculate total revenue
        const revenueResult = await db
            .select({
                totalRevenue: sum(transactionsModel.amount),
                transactionCount: count(),
            })
            .from(transactionsModel)
            .where(and(...conditions));

        const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue as string || '0');
        const transactionCount = Number(revenueResult[0]?.transactionCount || 0);

        // Get revenue trend by period
        let dateFormat: string;
        switch (period) {
            case 'day':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                dateFormat = 'IYYY-IW'; // ISO week
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            case 'year':
                dateFormat = 'YYYY';
                break;
        }

        const dateFormatSql = sql.raw(`'${dateFormat}'`);
        const revenueTrend = await db
            .select({
                period: sql<string>`TO_CHAR(${transactionsModel.transactionDate}, ${dateFormatSql})`,
                revenue: sum(transactionsModel.amount),
                count: count(),
            })
            .from(transactionsModel)
            .where(and(...conditions))
            .groupBy(sql`TO_CHAR(${transactionsModel.transactionDate}, ${dateFormatSql})`)
            .orderBy(sql`TO_CHAR(${transactionsModel.transactionDate}, ${dateFormatSql})`);

        // Calculate MRR (Monthly Recurring Revenue) from active subscriptions
        const mrrResult = await db
            .select({
                mrr: sum(sql`CAST(${plansTable.price} AS NUMERIC)`),
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(userSubscriptionsTable.status, 'active'),
                    eq(plansTable.billingInterval, 'monthly')
                )
            );

        const mrr = parseFloat(mrrResult[0]?.mrr as string || '0');

        // Get total active Pro users for ARPU calculation
        const activeUsersResult = await db
            .select({ count: count() })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(userSubscriptionsTable.status, 'active'),
                    eq(plansTable.planType, 'pro')
                )
            );

        const activeProUsers = Number(activeUsersResult[0]?.count || 0);

        // Calculate ARPU (Average Revenue Per User)
        const arpu = activeProUsers > 0 ? totalRevenue / activeProUsers : 0;

        // Calculate LTV (Lifetime Value)
        // LTV = ARPU * Average Customer Lifetime (in months)
        // We'll use average subscription duration in months
        const avgDurationResult = await db
            .select({
                avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${userSubscriptionsTable.currentPeriodEnd} - ${userSubscriptionsTable.createdAt})) / 86400)`,
            })
            .from(userSubscriptionsTable)
            .where(eq(userSubscriptionsTable.status, 'active'));

        const avgDurationDays = Number(avgDurationResult[0]?.avgDays || 30);
        const avgDurationMonths = avgDurationDays / 30;
        const ltv = arpu * avgDurationMonths;

        // Revenue by gateway
        const revenueByGateway = await db
            .select({
                gateway: transactionsModel.gateway,
                revenue: sum(transactionsModel.amount),
                count: count(),
            })
            .from(transactionsModel)
            .where(and(...conditions))
            .groupBy(transactionsModel.gateway)
            .orderBy(desc(sum(transactionsModel.amount)));

        // Revenue by plan
        const revenueByPlan = await db
            .select({
                planType: plansTable.planType,
                planName: plansTable.name,
                revenue: sum(sql`CAST(${plansTable.price} AS NUMERIC)`),
                subscriberCount: count(),
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(eq(userSubscriptionsTable.status, 'active'))
            .groupBy(plansTable.planType, plansTable.name)
            .orderBy(desc(sum(sql`CAST(${plansTable.price} AS NUMERIC)`)));

        // Calculate growth rate (comparing to previous period)
        const previousPeriodStart = new Date(start);
        const periodDiff = end.getTime() - start.getTime();
        previousPeriodStart.setTime(start.getTime() - periodDiff);

        const previousRevenueResult = await db
            .select({
                totalRevenue: sum(transactionsModel.amount),
            })
            .from(transactionsModel)
            .where(
                and(
                    eq(transactionsModel.status, 'success'),
                    gte(transactionsModel.transactionDate, previousPeriodStart),
                    lte(transactionsModel.transactionDate, start)
                )
            );

        const previousRevenue = parseFloat(previousRevenueResult[0]?.totalRevenue as string || '0');
        const growthRate = previousRevenue > 0 
            ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
            : 0;

        return {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            transactionCount,
            mrr: parseFloat(mrr.toFixed(2)),
            arpu: parseFloat(arpu.toFixed(2)),
            ltv: parseFloat(ltv.toFixed(2)),
            activeProUsers,
            growthRate: parseFloat(growthRate.toFixed(2)),
            averageTransactionValue: transactionCount > 0 
                ? parseFloat((totalRevenue / transactionCount).toFixed(2)) 
                : 0,
            revenueTrend: revenueTrend.map((item) => ({
                period: item.period,
                revenue: parseFloat(item.revenue as string || '0'),
                count: Number(item.count),
            })),
            revenueByGateway: revenueByGateway.map((item) => ({
                gateway: item.gateway,
                revenue: parseFloat(item.revenue as string || '0'),
                count: Number(item.count),
                percentage: totalRevenue > 0 
                    ? parseFloat(((parseFloat(item.revenue as string || '0') / totalRevenue) * 100).toFixed(2))
                    : 0,
            })),
            revenueByPlan: revenueByPlan.map((item) => ({
                planType: item.planType,
                planName: item.planName,
                revenue: parseFloat(item.revenue as string || '0'),
                subscriberCount: Number(item.subscriberCount),
            })),
        };
    }

    // ============ REVENUE BREAKDOWN ============

    async getRevenueBreakdown(filters: GetRevenueBreakdownQueryDto) {
        const { groupBy, startDate, endDate } = filters;

        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 12));
        const end = endDate ? new Date(endDate) : new Date();

        const conditions = [
            eq(transactionsModel.status, 'success'),
            gte(transactionsModel.transactionDate, start),
            lte(transactionsModel.transactionDate, end),
        ];

        if (groupBy === 'gateway') {
            const result = await db
                .select({
                    gateway: transactionsModel.gateway,
                    revenue: sum(transactionsModel.amount),
                    count: count(),
                })
                .from(transactionsModel)
                .where(and(...conditions))
                .groupBy(transactionsModel.gateway)
                .orderBy(desc(sum(transactionsModel.amount)));

            return result.map((item) => ({
                key: item.gateway,
                revenue: parseFloat(item.revenue as string || '0'),
                count: Number(item.count),
            }));
        }

        if (groupBy === 'plan') {
            const result = await db
                .select({
                    planType: plansTable.planType,
                    planName: plansTable.name,
                    revenue: sum(sql`CAST(${plansTable.price} AS NUMERIC)`),
                    count: count(),
                })
                .from(userSubscriptionsTable)
                .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
                .where(
                    and(
                        eq(userSubscriptionsTable.status, 'active'),
                        gte(userSubscriptionsTable.createdAt, start),
                        lte(userSubscriptionsTable.createdAt, end)
                    )
                )
                .groupBy(plansTable.planType, plansTable.name)
                .orderBy(desc(sum(sql`CAST(${plansTable.price} AS NUMERIC)`)));

            return result.map((item) => ({
                key: `${item.planType} - ${item.planName}`,
                revenue: parseFloat(item.revenue as string || '0'),
                count: Number(item.count),
            }));
        }

        // Default: group by period (month)
        const result = await db
            .select({
                period: sql<string>`TO_CHAR(${transactionsModel.transactionDate}, 'YYYY-MM')`,
                revenue: sum(transactionsModel.amount),
                count: count(),
            })
            .from(transactionsModel)
            .where(and(...conditions))
            .groupBy(sql`TO_CHAR(${transactionsModel.transactionDate}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${transactionsModel.transactionDate}, 'YYYY-MM')`);

        return result.map((item) => ({
            key: item.period,
            revenue: parseFloat(item.revenue as string || '0'),
            count: Number(item.count),
        }));
    }

    // ============ TOP CUSTOMERS BY REVENUE ============

    async getTopCustomers(limit: number = 10) {
        const result = await db
            .select({
                userId: transactionsModel.userId,
                username: usersTable.username,
                email: usersTable.email,
                totalRevenue: sum(transactionsModel.amount),
                transactionCount: count(),
            })
            .from(transactionsModel)
            .leftJoin(usersTable, eq(transactionsModel.userId, usersTable.userId))
            .where(eq(transactionsModel.status, 'success'))
            .groupBy(transactionsModel.userId, usersTable.username, usersTable.email)
            .orderBy(desc(sum(transactionsModel.amount)))
            .limit(limit);

        return result.map((item) => ({
            userId: item.userId,
            username: item.username,
            email: item.email,
            totalRevenue: parseFloat(item.totalRevenue as string || '0'),
            transactionCount: Number(item.transactionCount),
        }));
    }
}

export const adminRevenueService = new AdminRevenueService();

