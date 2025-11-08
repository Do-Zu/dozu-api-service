import db from '@/libs/drizzleClient.lib';
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';
import { userSubscriptionsTable, plansTable } from '@/models/subscription';
import { usersTable } from '@/models/user.model';
import { GetSubscriptionsQueryDto } from '@/dtos/admin/subscriptionStats.dto';

class AdminSubscriptionStatsService {
    // ============ STATISTICS ============

    async getSubscriptionStats(startDate?: Date, endDate?: Date) {
        // Get total users
        const totalUsersResult = await db.select({ count: count() }).from(usersTable);
        const totalUsers = Number(totalUsersResult[0]?.count || 0);

        // Get active Pro users
        const activeProUsers = await db
            .select({ count: count() })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(userSubscriptionsTable.status, 'active'),
                    eq(plansTable.planType, 'pro')
                )
            );
        const totalProUsers = Number(activeProUsers[0]?.count || 0);

        // Get active Free users (users without active subscription or with free plan)
        const activeFreeUsers = await db
            .select({ count: count() })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(userSubscriptionsTable.status, 'active'),
                    eq(plansTable.planType, 'free')
                )
            );
        const totalFreeUsers = Number(activeFreeUsers[0]?.count || 0);

        // Users without any subscription are considered free
        const usersWithoutSubscription = totalUsers - totalProUsers - totalFreeUsers;

        // Conversion rate (Free → Pro)
        const conversionRate = totalUsers > 0 ? ((totalProUsers / totalUsers) * 100).toFixed(2) : '0.00';

        // Get subscriptions that ended (cancelled or expired)
        const endedSubscriptions = await db
            .select({
                subscriptionId: userSubscriptionsTable.subscriptionId,
                userId: userSubscriptionsTable.userId,
                status: userSubscriptionsTable.status,
                createdAt: userSubscriptionsTable.createdAt,
                canceledAt: userSubscriptionsTable.canceledAt,
                currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(plansTable.planType, 'pro'),
                    sql`${userSubscriptionsTable.status} IN ('cancelled', 'expired')`
                )
            );

        // Calculate average subscription duration (in days)
        let averageDuration = 0;
        if (endedSubscriptions.length > 0) {
            const validSubscriptions = endedSubscriptions.filter(
                (sub) => sub.createdAt && (sub.canceledAt || sub.currentPeriodEnd)
            );
            
            if (validSubscriptions.length > 0) {
                const durations = validSubscriptions.map((sub) => {
                    const start = new Date(sub.createdAt as Date);
                    const end = sub.canceledAt 
                        ? new Date(sub.canceledAt as Date) 
                        : new Date(sub.currentPeriodEnd as Date);
                    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                });
                averageDuration = Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length);
            }
        } else {
            // If no ended subscriptions, calculate for active ones
            const activeSubscriptions = await db
                .select({
                    subscriptionId: userSubscriptionsTable.subscriptionId,
                    createdAt: userSubscriptionsTable.createdAt,
                })
                .from(userSubscriptionsTable)
                .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
                .where(
                    and(
                        eq(userSubscriptionsTable.status, 'active'),
                        eq(plansTable.planType, 'pro')
                    )
                );

            const validActiveSubscriptions = activeSubscriptions.filter((sub) => sub.createdAt);
            
            if (validActiveSubscriptions.length > 0) {
                const now = new Date();
                const durations = validActiveSubscriptions.map((sub) => {
                    const start = new Date(sub.createdAt as Date);
                    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                });
                averageDuration = Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length);
            }
        }

        // Get subscription status breakdown
        const statusBreakdown = await db
            .select({
                status: userSubscriptionsTable.status,
                count: count(),
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(eq(plansTable.planType, 'pro'))
            .groupBy(userSubscriptionsTable.status);

        // Get monthly subscription trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await db
            .select({
                month: sql<string>`TO_CHAR(${userSubscriptionsTable.createdAt}, 'YYYY-MM')`,
                count: count(),
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(plansTable.planType, 'pro'),
                    gte(userSubscriptionsTable.createdAt, sixMonthsAgo)
                )
            )
            .groupBy(sql`TO_CHAR(${userSubscriptionsTable.createdAt}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${userSubscriptionsTable.createdAt}, 'YYYY-MM')`);

        return {
            totalUsers,
            totalProUsers,
            totalFreeUsers: totalFreeUsers + usersWithoutSubscription,
            conversionRate: parseFloat(conversionRate),
            averageDurationDays: averageDuration,
            statusBreakdown: statusBreakdown.map((s) => ({
                status: s.status,
                count: Number(s.count),
            })),
            monthlyTrend: monthlyTrend.map((m) => ({
                month: m.month,
                count: Number(m.count),
            })),
        };
    }

    // ============ SUBSCRIPTION MANAGEMENT ============

    async getAllSubscriptions(filters: GetSubscriptionsQueryDto) {
        const { status, planType, page = '1', limit = '50' } = filters;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const conditions = [];
        if (status) conditions.push(eq(userSubscriptionsTable.status, status));
        if (planType) conditions.push(eq(plansTable.planType, planType));

        const subscriptions = await db
            .select({
                subscriptionId: userSubscriptionsTable.subscriptionId,
                userId: userSubscriptionsTable.userId,
                username: usersTable.username,
                email: usersTable.email,
                planId: plansTable.planId,
                planName: plansTable.name,
                planType: plansTable.planType,
                price: plansTable.price,
                status: userSubscriptionsTable.status,
                currentPeriodStart: userSubscriptionsTable.currentPeriodStart,
                currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
                trialStart: userSubscriptionsTable.trialStart,
                trialEnd: userSubscriptionsTable.trialEnd,
                cancelAt: userSubscriptionsTable.cancelAt,
                canceledAt: userSubscriptionsTable.canceledAt,
                cancellationReason: userSubscriptionsTable.cancellationReason,
                autoRenew: userSubscriptionsTable.autoRenew,
                createdAt: userSubscriptionsTable.createdAt,
            })
            .from(userSubscriptionsTable)
            .leftJoin(usersTable, eq(userSubscriptionsTable.userId, usersTable.userId))
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(parseInt(limit))
            .offset(offset);

        // Get total count
        const totalResult = await db
            .select({ count: count() })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return {
            subscriptions,
            total: Number(totalResult[0]?.count || 0),
            page: parseInt(page),
            limit: parseInt(limit),
        };
    }

    async getSubscriptionById(subscriptionId: number) {
        const subscription = await db
            .select({
                subscriptionId: userSubscriptionsTable.subscriptionId,
                userId: userSubscriptionsTable.userId,
                username: usersTable.username,
                email: usersTable.email,
                planId: plansTable.planId,
                planName: plansTable.name,
                planType: plansTable.planType,
                price: plansTable.price,
                billingInterval: plansTable.billingInterval,
                status: userSubscriptionsTable.status,
                currentPeriodStart: userSubscriptionsTable.currentPeriodStart,
                currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
                trialStart: userSubscriptionsTable.trialStart,
                trialEnd: userSubscriptionsTable.trialEnd,
                cancelAt: userSubscriptionsTable.cancelAt,
                canceledAt: userSubscriptionsTable.canceledAt,
                cancellationReason: userSubscriptionsTable.cancellationReason,
                autoRenew: userSubscriptionsTable.autoRenew,
                externalSubscriptionId: userSubscriptionsTable.externalSubscriptionId,
                createdAt: userSubscriptionsTable.createdAt,
                updatedAt: userSubscriptionsTable.updatedAt,
            })
            .from(userSubscriptionsTable)
            .leftJoin(usersTable, eq(userSubscriptionsTable.userId, usersTable.userId))
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
            .limit(1);

        return subscription[0] || null;
    }

    async getUserSubscriptionHistory(userId: number) {
        const history = await db
            .select({
                subscriptionId: userSubscriptionsTable.subscriptionId,
                planName: plansTable.name,
                planType: plansTable.planType,
                status: userSubscriptionsTable.status,
                currentPeriodStart: userSubscriptionsTable.currentPeriodStart,
                currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
                canceledAt: userSubscriptionsTable.canceledAt,
                cancellationReason: userSubscriptionsTable.cancellationReason,
                createdAt: userSubscriptionsTable.createdAt,
            })
            .from(userSubscriptionsTable)
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(eq(userSubscriptionsTable.userId, userId))
            .orderBy(desc(userSubscriptionsTable.createdAt));

        return history;
    }
}

export const adminSubscriptionStatsService = new AdminSubscriptionStatsService();

