import { BadRequest, NotFoundError } from '@/core/error';
import db, { Database, Transaction } from '@/libs/drizzleClient.lib';
import {
    featuresTable,
    IBillingInterval,
    IFeatureUsageInterval,
    planFeaturesTable,
    SubscriptionStatus,
    userFeatureUsageTable,
    userSubscriptionsTable,
    type InsertUserFeatureUsage,
    type InsertUserSubscription,
    type SelectUserSubscription,
} from '@/models/subscription';
import subscriptionRepo from '@/repositories/subscription/subscription.repo';
import { getCurrentDateInTimeZone, getSystemDate } from '@/utils/date';
import { addDays, addMonths, addYears, differenceInSeconds, endOfDay } from 'date-fns';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import planService from './plan.service';
import { featureUsageService } from './usage/featureUsage.service';
import { SubscriptionStatusEnum } from '@/dtos/subscription/subscription.dto';
import { compareIgnoreCapitalization, isEmpty, safeDestructure } from '@/utils/common';
import { SUBSCRIPTION_CONSTANTS } from '@/middleware/subscription/constants/subscription.constants';

export interface IFeature {
    planId: number;
    featureId: number;
    name: string;
    description: string | null;
    booleanValue: boolean | null;
    numericValue: string | null;
    textValue: string | null;
    isUnlimited: boolean | null;
    isEnabled: boolean | null;
    apiUrl: string | null;
}
export interface SelectPlanWithFeatures {
    planId: number;
    name: string;
    description: string | null;
    planType: string;
    billingInterval: string;
    price: string;
    currency: string;
    isActive: boolean;
    tier: number;
    features: IFeature[];
}

interface IPlan {
    planId: number;
    name: string;
    description: string | null;
    planType: string;
    billingInterval: string;
    price: string;
    currency: string;
    isActive: boolean;
    tier: number;
    featureId: number | null;
    featureName: string | null;
    featureDescription: string | null;
    booleanValue: boolean | null;
    numericValue: string | null;
    textValue: string | null;
    isUnlimited: boolean | null;
    isEnabled: boolean | null;
    apiUrl: string | null;
}
export class SubscriptionService {
    private readonly DEFAULT_VALUE_USAGE = '0';
    private readonly DEFAULT_CURRENCY = 'USD';
    private readonly DEFAULT_DATE_FOR_MONTH = 30;
    private readonly DEFAULT_DATE_FOR_WEEK = 7;
    private readonly DEFAULT_DATE_FOR_YEAR = 365;

    /**
     * Transform database result rows into plans with features structure
     */
    private transformPlansWithFeatures(rows: IPlan[]): SelectPlanWithFeatures[] {
        const plansMap = new Map<number, SelectPlanWithFeatures>();

        rows.forEach(row => {
            if (!plansMap.has(row.planId)) {
                plansMap.set(row.planId, {
                    planId: row.planId,
                    name: row.name,
                    description: row.description,
                    planType: row.planType,
                    billingInterval: row.billingInterval,
                    price: row.price,
                    currency: row.currency,
                    isActive: row.isActive,
                    tier: row.tier,
                    features: [],
                });
            }

            const plan = plansMap.get(row.planId)!;

            if (row?.featureId && row?.featureName) {
                plan.features.push({
                    planId: row.planId,
                    featureId: row.featureId,
                    name: row.featureName,
                    description: row.featureDescription,
                    booleanValue: row.booleanValue,
                    numericValue: row.numericValue,
                    textValue: row.textValue,
                    isUnlimited: row.isUnlimited,
                    isEnabled: row.isEnabled,
                    apiUrl: row.apiUrl,
                });
            }
        });

        return Array.from(plansMap.values());
    }

    /**
     * Get all available plans with their features
     */
    public async getAvailablePlans() {
        const rows = await subscriptionRepo.getAllPlansWithFeatures();

        if (isEmpty(rows)) {
            throw new NotFoundError('No plans available');
        }

        const plansWithFeatures = this.transformPlansWithFeatures(rows);

        return plansWithFeatures;
    }

    public async getAvailablePlanForUserUpgrade(payload: { userId: number; timezone: string }) {
        const { userId, timezone } = safeDestructure(payload);

        const { plan, subscription } = await this.getUserSubscriptionWithPlan({
            userId,
            timezone,
        });

        if (!plan || !subscription) {
            throw new BadRequest();
        }

        const { tier } = safeDestructure(plan);

        const rows = await subscriptionRepo.filterPlansWithFeaturesForUpgrade({
            tier,
        });

        if (isEmpty(rows)) {
            return [];
        }

        const plansWithFeatures = this.transformPlansWithFeatures(rows);

        return plansWithFeatures;
    }

    public async getFeatureAbilityOfPlan({ planId, featureId }: { planId: number; featureId: number }) {
        const feature = await db
            .select({
                planFeatureId: planFeaturesTable.planFeatureId,
                featureType: featuresTable.featureType,
                interval: planFeaturesTable.interval,
                category: featuresTable.category,
                unit: featuresTable.unit,
                sortOrder: featuresTable.sortOrder,
                booleanValue: planFeaturesTable.booleanValue,
                numericValue: planFeaturesTable.numericValue,
                textValue: planFeaturesTable.textValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                isEnabled: planFeaturesTable.isEnabled,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(
                and(
                    eq(planFeaturesTable.planId, planId),
                    eq(planFeaturesTable.featureId, featureId),
                    eq(planFeaturesTable.isEnabled, true),
                    eq(featuresTable.isActive, true)
                )
            )
            .limit(1);

        if (!feature[0]) {
            throw new NotFoundError(`Feature ${featureId} not found for plan ${planId}`);
        }

        return feature[0];
    }

    public async getAllFeaturesOfPlan({ planId }: { planId: number }) {
        const features = await db
            .select({
                featureId: featuresTable.featureId,
                name: featuresTable.name,
                description: featuresTable.description,
                featureType: featuresTable.featureType,
                featureIntervalExpire: planFeaturesTable.interval,
                category: featuresTable.category,
                unit: featuresTable.unit,
                apiUrl: planFeaturesTable.apiUrl,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(and(eq(planFeaturesTable.planId, planId), eq(featuresTable.isActive, true)));

        return features;
    }

    /**
     * Get user's current active subscription
     */
    async getUserActiveSubscription(userId: number): Promise<SelectUserSubscription | null> {
        const subscription = await db
            .select()
            .from(userSubscriptionsTable)
            .where(and(eq(userSubscriptionsTable.userId, userId), eq(userSubscriptionsTable.status, 'active')))
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(1);

        return subscription[0] || null;
    }

    /**
     * Get user's subscription with plan details
     */
    async getUserSubscriptionWithPlan({ userId, timezone }: { userId: number; timezone: string }) {
        const result = await subscriptionRepo.getUserSubscriptionWithPlan(userId);

        if (!result) {
            return await this.createSubscriptionFreePlan({ userId, timezone });
        }

        return result;
    }

    public async createSubscriptionFreePlan({ userId, timezone }: { userId: number; timezone: string }) {
        const freePlan = await planService.getFreePlan();

        const resultCreteSubScriptionFreePlan = await this.createSubscription({
            userId,
            planId: freePlan.planId,
            paymentData: {
                amount: 0,
            },
            timeZone: timezone,
        });

        if (!resultCreteSubScriptionFreePlan) {
            throw new NotFoundError('Failed to create subscription for free plan');
        }

        return {
            plan: freePlan,
            subscription: resultCreteSubScriptionFreePlan,
        };
    }

    /**
     * Create a new subscription for a user
     */
    public async createSubscription(params: {
        userId: number;
        planId: number;
        paymentData: {
            amount: number;
            currency?: string;
            externalSubscriptionId?: string;
        };
        timeZone: string;
    }): Promise<SelectUserSubscription> {
        const { userId, planId, paymentData, timeZone } = params;

        const { planType, billingInterval } = await planService.getPlanById(planId);

        if (!planType || !billingInterval) {
            throw new NotFoundError(`Plan with ID ${planId} not found`);
        }

        return await db.transaction(async tx => {
            const startDateSubscription = getCurrentDateInTimeZone(timeZone);
            const endDateSubscription = this.calculateSubscriptionEndDate(billingInterval, startDateSubscription);

            const subscription: InsertUserSubscription = {
                userId,
                planId,
                status: 'active',
                currentPeriodStart: startDateSubscription,
                currentPeriodEnd: endDateSubscription,
                externalSubscriptionId: paymentData?.externalSubscriptionId,
                autoRenew: true,
            };

            const [newSubscription] = await tx.insert(userSubscriptionsTable).values(subscription).returning();

            // Initialize user feature usage for this subscription
            await this.initializeUserFeatureUsage({
                tx,
                userId,
                planId,
                subscriptionId: newSubscription.subscriptionId,
                timeZone,
            });

            return newSubscription;
        });
    }

    private timeToLive(today: string, timezone?: string, interval?: IFeatureUsageInterval): number {
        const currentTimeInTimezone = getCurrentDateInTimeZone(timezone, today);
        const endOfDateTimezone = endOfDay(currentTimeInTimezone);

        if (interval === 'daily') {
            return differenceInSeconds(endOfDateTimezone, currentTimeInTimezone);
        } else if (interval === 'weekly') {
            const endOfWeek = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_WEEK);
            return differenceInSeconds(endOfWeek, currentTimeInTimezone);
        } else if (interval === 'monthly') {
            const endOfMonth = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_MONTH);
            return differenceInSeconds(endOfMonth, currentTimeInTimezone);
        } else if (interval === 'yearly') {
            const endOfYear = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_YEAR);
            return differenceInSeconds(endOfYear, currentTimeInTimezone);
        }

        return -1;
    }

    private calculateSubscriptionEndDate(billingInterval: IBillingInterval, startDateSubscription: Date) {
        switch (billingInterval) {
            case 'monthly':
                return addMonths(startDateSubscription, 1);
            case 'yearly':
                return addYears(startDateSubscription, 1);
            case 'custom':
                // TODO: Implement custom billing logic for custom intervals
                return startDateSubscription;
            default:
                throw new Error(`Unsupported billing interval: ${billingInterval}`);
        }
    }

    /**
     * Initialize user feature usage based on their plan
     */
    private async initializeUserFeatureUsage({
        tx,
        userId,
        planId,
        subscriptionId,
        timeZone,
    }: {
        tx: Transaction;
        userId: number;
        planId: number;
        subscriptionId: number;
        timeZone: string;
    }) {
        // Get plan features
        const planFeatures = await tx
            .select({
                featureId: planFeaturesTable.featureId,
                numericValue: planFeaturesTable.numericValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                feature: featuresTable,
                interval: planFeaturesTable.interval,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(and(eq(planFeaturesTable.planId, planId), eq(planFeaturesTable.isEnabled, true)));

        if (!planFeatures || planFeatures.length === 0) {
            throw new NotFoundError(`No features found for plan ${planId}`);
        }

        const usageRecords: InsertUserFeatureUsage[] = planFeatures.map(planFeature => {
            const now = getCurrentDateInTimeZone(timeZone);

            const { start, end } = featureUsageService.getPeriodRange({
                date: now,
                timezone: timeZone,
                interval: planFeature.interval,
            });

            return {
                userId,
                featureId: planFeature.featureId,
                subscriptionId,
                usedValue: this.DEFAULT_VALUE_USAGE,
                limitValue: planFeature.numericValue ? planFeature.numericValue.toString() : null,
                isUnlimited: planFeature.isUnlimited,
                resetPeriodStart: start,
                resetPeriodEnd: end,
                lastResetAt: now,
                updatedAt: now,
            };
        });

        if (usageRecords.length > 0) {
            await tx
                .insert(userFeatureUsageTable)
                .values(usageRecords)
                .onConflictDoUpdate({
                    target: [
                        userFeatureUsageTable.userId,
                        userFeatureUsageTable.featureId,
                        userFeatureUsageTable.resetPeriodStart,
                    ],
                    set: {
                        // When plan changes or re-initializing within same period,
                        // reset usage and update current limits and flags
                        usedValue: this.DEFAULT_VALUE_USAGE,
                        limitValue: sql`excluded.limit_value`,
                        isUnlimited: sql`excluded.is_unlimited`,
                        subscriptionId: sql`excluded.subscription_id`,
                        resetPeriodStart: sql`excluded.reset_period_start`,
                        resetPeriodEnd: sql`excluded.reset_period_end`,
                        lastResetAt: sql`excluded.last_reset_at`,
                        updatedAt: sql`excluded.updated_at`,
                    },
                });
        }
    }

    /**
     * Check if user can use a feature
     */
    async canUseFeature(
        userId: number,
        featureName: string,
        requestedAmount: number = 1
    ): Promise<{ canUse: boolean; remaining?: number; isUnlimited?: boolean }> {
        const feature = await db.select().from(featuresTable).where(eq(featuresTable.name, featureName)).limit(1);

        if (!feature[0]) {
            return { canUse: false };
        }

        const usage = await db
            .select()
            .from(userFeatureUsageTable)
            .where(
                and(
                    eq(userFeatureUsageTable.userId, userId),
                    eq(userFeatureUsageTable.featureId, feature[0].featureId),
                    gte(userFeatureUsageTable.resetPeriodEnd, new Date())
                )
            )
            .limit(1);

        if (!usage[0]) {
            return { canUse: false };
        }

        if (usage[0].isUnlimited) {
            return { canUse: true, isUnlimited: true };
        }

        const used = parseFloat(usage[0].usedValue);
        const limit = usage[0].limitValue ? parseFloat(usage[0].limitValue) : 0;
        const remaining = limit - used;

        return {
            canUse: remaining >= requestedAmount,
            remaining,
            isUnlimited: false,
        };
    }

    /**
     * Record feature usage
     */
    async recordFeatureUsage(userId: number, featureName: string, usageAmount: number = 1): Promise<boolean> {
        const feature = await db.select().from(featuresTable).where(eq(featuresTable.name, featureName)).limit(1);

        if (!feature[0]) {
            return false;
        }

        const usage = await db
            .select()
            .from(userFeatureUsageTable)
            .where(
                and(
                    eq(userFeatureUsageTable.userId, userId),
                    eq(userFeatureUsageTable.featureId, feature[0].featureId),
                    gte(userFeatureUsageTable.resetPeriodEnd, new Date())
                )
            )
            .limit(1);

        if (!usage[0]) {
            return false;
        }

        if (usage[0].isUnlimited) {
            return true; // No need to track usage for unlimited features
        }

        const currentUsed = parseFloat(usage[0].usedValue);
        const newUsed = currentUsed + usageAmount;

        await db
            .update(userFeatureUsageTable)
            .set({
                usedValue: newUsed.toString(),
                updatedAt: new Date(),
            })
            .where(eq(userFeatureUsageTable.usageId, usage[0].usageId));

        return true;
    }

    /**
     * Get user's feature usage summary
     */
    async getUserFeatureUsage(userId: number) {
        const usages = await db
            .select({
                usage: userFeatureUsageTable,
                feature: featuresTable,
            })
            .from(userFeatureUsageTable)
            .innerJoin(featuresTable, eq(userFeatureUsageTable.featureId, featuresTable.featureId))
            .where(
                and(eq(userFeatureUsageTable.userId, userId), gte(userFeatureUsageTable.resetPeriodEnd, new Date()))
            );

        return usages.map(u => ({
            featureName: u.feature.name,
            category: u.feature.category,
            featureType: u.feature.featureType,
            unit: u.feature.unit,
            used: parseFloat(u.usage.usedValue),
            limit: u.usage.limitValue ? parseFloat(u.usage.limitValue) : null,
            isUnlimited: u.usage.isUnlimited,
            usagePercentage: u.usage.isUnlimited
                ? 0
                : u.usage.limitValue
                  ? (parseFloat(u.usage.usedValue) / parseFloat(u.usage.limitValue)) * 100
                  : 0,
            resetPeriodEnd: u.usage.resetPeriodEnd,
        }));
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId: number, reason?: string, cancelTime?: Date): Promise<boolean> {
        const result = await db
            .update(userSubscriptionsTable)
            .set({
                status: SubscriptionStatusEnum.CANCELLED,
                canceledAt: cancelTime,
                cancellationReason: reason,
                cancelAt: cancelTime,
                autoRenew: false,
                updatedAt: cancelTime,
            })
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
            .returning();

        return result.length > 0;
    }

    public async changeSubscription({
        userId,
        newPlanId,
        timeZone,
        paymentData,
        status = SubscriptionStatusEnum.CANCELLED,
    }: {
        userId: number;
        newPlanId: number;
        timeZone: string;
        paymentData?: {
            currency?: string;
            externalSubscriptionId?: string;
        };
        status?: SubscriptionStatus;
    }): Promise<SelectUserSubscription | null> {
        return await db.transaction(async tx => {
            // Get current subscription
            const currentSubscription = await tx
                .select()
                .from(userSubscriptionsTable)
                .where(
                    and(
                        eq(userSubscriptionsTable.userId, userId),
                        eq(userSubscriptionsTable.status, SubscriptionStatusEnum.ACTIVE)
                    )
                )
                .limit(1);

            if (!currentSubscription[0]) {
                return null;
            }

            const currentDate = getCurrentDateInTimeZone(timeZone);

            // Cancel current subscription within transaction
            await tx
                .update(userSubscriptionsTable)
                .set({
                    status,
                    canceledAt: currentDate,
                    cancellationReason: 'Plan change',
                    autoRenew: false,
                    updatedAt: currentDate,
                })
                .where(eq(userSubscriptionsTable.subscriptionId, currentSubscription[0].subscriptionId));

            // Create new subscription within same transaction
            const { planType, billingInterval } = await planService.getPlanById(newPlanId);

            if (!planType || !billingInterval) {
                throw new NotFoundError(`Plan unavailable!`);
            }

            const startDateSubscription = getCurrentDateInTimeZone(timeZone);
            const endDateSubscription = this.calculateSubscriptionEndDate(billingInterval, startDateSubscription);

            const subscription: InsertUserSubscription = {
                userId,
                planId: newPlanId,
                status: SubscriptionStatusEnum.ACTIVE,
                currentPeriodStart: startDateSubscription,
                currentPeriodEnd: endDateSubscription,
                externalSubscriptionId: paymentData?.externalSubscriptionId,
                autoRenew: false,
            };

            const [newSubscription] = await tx.insert(userSubscriptionsTable).values(subscription).returning();

            // Initialize feature usage for new subscription
            await this.initializeUserFeatureUsage({
                tx,
                userId,
                planId: newPlanId,
                subscriptionId: newSubscription.subscriptionId,
                timeZone,
            });

            return newSubscription;
        });
    }

    /**
     * Process subscription renewal
     */
    async processRenewal({ subscriptionId, timezone }: { subscriptionId: number; timezone: string }): Promise<{
        newPeriodStart: Date;
        newPeriodEnd: Date;
    } | null> {
        return await db.transaction(async tx => {
            const [subscription] = await tx
                .select()
                .from(userSubscriptionsTable)
                .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
                .limit(1);

            if (!subscription) {
                throw new NotFoundError('Subscription Not Found When Renewal');
            }

            const plan = await planService.getPlanById(subscription.planId);

            if (!plan) {
                return null;
            }

            const isFreePlan = compareIgnoreCapitalization(plan.planType, SUBSCRIPTION_CONSTANTS.FREE_PLAN_TYPE);

            if (!subscription?.autoRenew && !isFreePlan) {
                return null;
            }

            const newPeriodStart = getCurrentDateInTimeZone(timezone, getSystemDate());
            const newPeriodEnd = this.calculateSubscriptionEndDate(plan.billingInterval, newPeriodStart);

            await tx
                .update(userSubscriptionsTable)
                .set({
                    currentPeriodStart: newPeriodStart,
                    currentPeriodEnd: newPeriodEnd,
                    updatedAt: getSystemDate(),
                })
                .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId));

            const { planId } = plan;

            // Reset feature usage for the new period
            await this.resetFeatureUsage(subscription.userId, subscriptionId, planId, timezone, tx);

            return {
                newPeriodStart,
                newPeriodEnd,
            };
        });
    }

    /**
     * Reset feature usage for a new billing period
     */
    private async resetFeatureUsage(
        userId: number,
        subscriptionId: number,
        planId: number,
        timezone: string,
        tx: Transaction | Database = db
    ) {
        return await this.initializeUserFeatureUsage({
            tx: tx as Transaction,
            planId,
            subscriptionId,
            timeZone: timezone,
            userId,
        });
    }
}

export default new SubscriptionService();
