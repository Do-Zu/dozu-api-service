/* eslint-disable no-undef */
import { Request, Response, NextFunction } from 'express';
import { BadRequest, Forbidden, InternalServerError, NotFoundError, PaymentRequire } from '@/core/error';
import { SubscriptionStatusEnum } from '@/dtos/subscription/subscription.dto';

// Mock dependencies - must be before imports
jest.mock('@/services/subscription/subscription.service', () => ({
    __esModule: true,
    default: {
        getUserSubscriptionWithPlan: jest.fn(),
        getFeatureAbilityOfPlan: jest.fn(),
        processRenewal: jest.fn(),
        changeSubscription: jest.fn(),
    },
}));

jest.mock('@/services/subscription/plan.service', () => ({
    __esModule: true,
    default: {
        getFreePlan: jest.fn(),
    },
}));

jest.mock('@/services/subscription/usage/featureUsage.service', () => ({
    __esModule: true,
    featureUsageService: {
        checkAndIncrementUsage: jest.fn(),
    },
}));

jest.mock('@/utils/auth/authHelpers.utils', () => ({
    __esModule: true,
    getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/utils/common', () => ({
    __esModule: true,
    compareIgnoreCapitalization: jest.fn((a: string, b: string) => a?.toLowerCase() === b?.toLowerCase()),
    safeDestructure: jest.fn((obj: object) => obj || {}),
}));

jest.mock('@/utils/date', () => ({
    __esModule: true,
    getCurrentDateInTimeZone: jest.fn(),
    getCurrentTimestampFromRequest: jest.fn(),
    getDateFormatted: jest.fn(),
    getSystemDate: jest.fn(),
    getTimezoneClient: jest.fn(),
    TIME_ZONE_SYSTEM: { UTC: 'UTC' },
}));

jest.mock('bullmq', () => ({
    __esModule: true,
    isEmpty: jest.fn((obj: object) => !obj || Object.keys(obj).length === 0),
}));

// Mock date-fns isBefore to control isExpiredDate behavior
jest.mock('date-fns', () => ({
    ...jest.requireActual('date-fns'),
    isBefore: jest.fn(),
}));

// Import after mocking
import subscriptionMiddleware from '../subscript.middleware';
import subscriptionService from '@/services/subscription/subscription.service';
import planService from '@/services/subscription/plan.service';
import { featureUsageService } from '@/services/subscription/usage/featureUsage.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { compareIgnoreCapitalization } from '@/utils/common';
import {
    getCurrentDateInTimeZone,
    getCurrentTimestampFromRequest,
    getDateFormatted,
    getSystemDate,
    getTimezoneClient,
} from '@/utils/date';
import { isEmpty } from 'bullmq';
import { isBefore } from 'date-fns';

// Cast mocks for easier usage
const mockGetUserSubscriptionWithPlan = subscriptionService.getUserSubscriptionWithPlan as jest.Mock;
const mockGetFeatureAbilityOfPlan = subscriptionService.getFeatureAbilityOfPlan as jest.Mock;
const mockProcessRenewal = subscriptionService.processRenewal as jest.Mock;
const mockChangeSubscription = subscriptionService.changeSubscription as jest.Mock;
const mockGetFreePlan = planService.getFreePlan as jest.Mock;
const mockCheckAndIncrementUsage = featureUsageService.checkAndIncrementUsage as jest.Mock;
const mockGetUserIdFromRequest = getUserIdFromRequest as jest.Mock;
const mockCompareIgnoreCapitalization = compareIgnoreCapitalization as jest.Mock;
const mockGetCurrentDateInTimeZone = getCurrentDateInTimeZone as jest.Mock;
const mockGetCurrentTimestampFromRequest = getCurrentTimestampFromRequest as jest.Mock;
const mockGetDateFormatted = getDateFormatted as jest.Mock;
const mockGetSystemDate = getSystemDate as jest.Mock;
const mockGetTimezoneClient = getTimezoneClient as jest.Mock;
const mockIsBefore = isBefore as jest.Mock; // This controls isExpiredDate behavior
const mockIsEmpty = isEmpty as jest.Mock;

describe('SubscriptionMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    const mockUserId = 1;
    const mockTimezone = 'Asia/Ho_Chi_Minh';
    const mockFeatureId = 100;
    const mockPlanId = 1;
    const mockSubscriptionId = 10;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            body: { featureId: mockFeatureId },
            headers: {},
        };
        mockRes = {};
        mockNext = jest.fn();

        // Setup default mocks
        mockGetUserIdFromRequest.mockReturnValue(mockUserId);
        mockGetTimezoneClient.mockReturnValue(mockTimezone);
        mockGetSystemDate.mockReturnValue(new Date('2025-12-09T10:00:00Z'));
        mockGetCurrentTimestampFromRequest.mockReturnValue(new Date('2025-12-09T10:00:00Z'));
        mockGetCurrentDateInTimeZone.mockImplementation((tz: string, date?: Date | string) => {
            return date ? new Date(date) : new Date('2025-12-09T10:00:00Z');
        });
        mockGetDateFormatted.mockReturnValue('2025-12-09');
        mockIsBefore.mockReturnValue(false);
        mockIsEmpty.mockReturnValue(false);
    });

    describe('handleSubscription', () => {
        describe('Time validation', () => {
            it('should throw Forbidden when client time is too far from server time', async () => {
                const serverTime = new Date('2025-12-09T10:00:00Z');
                const clientTime = new Date('2025-12-09T10:05:00Z'); // 5 minutes difference

                mockGetSystemDate.mockReturnValue(serverTime);
                mockGetCurrentTimestampFromRequest.mockReturnValue(clientTime);
                mockGetCurrentDateInTimeZone.mockImplementation((tz: string, date?: Date | string) => {
                    return date ? new Date(date) : serverTime;
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(Forbidden);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('client time is too far from server time');
            });

            it('should not throw when client and server time difference is within allowed boundary', async () => {
                const serverTime = new Date('2025-12-09T10:00:00Z');
                const clientTime = new Date('2025-12-09T10:00:30Z'); // 30 seconds difference

                mockGetSystemDate.mockReturnValue(serverTime);
                mockGetCurrentTimestampFromRequest.mockReturnValue(clientTime);
                mockGetCurrentDateInTimeZone.mockImplementation((tz: string, date?: Date | string) => {
                    return date ? new Date(date) : serverTime;
                });

                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId, planType: 'premium' },
                    subscription: {
                        subscriptionId: mockSubscriptionId,
                        status: 'active',
                        currentPeriodEnd: new Date('2025-12-31'),
                    },
                });

                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Feature validation', () => {
            it('should throw BadRequest when featureId is missing', async () => {
                mockReq.body = {};

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(BadRequest);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('feature is required for subscription check');
            });
        });

        describe('User plan validation', () => {
            it('should throw NotFoundError when user plan is not found', async () => {
                mockGetUserSubscriptionWithPlan.mockResolvedValue({});
                mockIsEmpty.mockReturnValue(true);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(NotFoundError);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('user plan not found');
            });

            it('should throw NotFoundError when plan is empty', async () => {
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: null,
                    subscription: { subscriptionId: mockSubscriptionId },
                });
                mockIsEmpty.mockImplementation((obj: object) => !obj || Object.keys(obj).length === 0);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(NotFoundError);
            });

            it('should throw NotFoundError when subscription is empty', async () => {
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId },
                    subscription: null,
                });
                mockIsEmpty.mockImplementation((obj: object) => !obj || Object.keys(obj).length === 0);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(NotFoundError);
            });
        });

        describe('Subscription expiration handling', () => {
            beforeEach(() => {
                mockIsEmpty.mockReturnValue(false);
            });

            it('should downgrade plan when non-free plan is expired', async () => {
                mockGetUserSubscriptionWithPlan
                    .mockResolvedValueOnce({
                        plan: { planId: mockPlanId, planType: 'premium' },
                        subscription: {
                            subscriptionId: mockSubscriptionId,
                            status: 'active',
                            currentPeriodEnd: new Date('2025-12-01'),
                        },
                    })
                    .mockResolvedValueOnce({
                        plan: { planId: 2, planType: 'free' },
                        subscription: {
                            subscriptionId: mockSubscriptionId,
                            status: 'active',
                            currentPeriodEnd: new Date('2025-12-31'),
                        },
                    });

                mockIsBefore.mockReturnValue(true);
                mockCompareIgnoreCapitalization.mockImplementation((a: string, b: string) => {
                    return a?.toLowerCase() === b?.toLowerCase();
                });

                mockGetFreePlan.mockResolvedValue({ planId: 2 });
                mockChangeSubscription.mockResolvedValue(true);
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockGetFreePlan).toHaveBeenCalled();
                expect(mockChangeSubscription).toHaveBeenCalledWith({
                    newPlanId: 2,
                    userId: mockUserId,
                    timeZone: mockTimezone,
                    status: SubscriptionStatusEnum.EXPIRED,
                });
            });

            it('should renew subscription when free plan is expired', async () => {
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId, planType: 'free' },
                    subscription: {
                        subscriptionId: mockSubscriptionId,
                        status: 'active',
                        currentPeriodEnd: new Date('2025-12-01'),
                    },
                });

                mockIsBefore.mockReturnValue(true);
                mockCompareIgnoreCapitalization.mockImplementation((a: string, b: string) => {
                    return a?.toLowerCase() === b?.toLowerCase();
                });

                mockProcessRenewal.mockResolvedValue({
                    newPeriodStart: new Date('2025-12-09'),
                    newPeriodEnd: new Date('2026-01-09'),
                });

                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockProcessRenewal).toHaveBeenCalledWith({
                    subscriptionId: mockSubscriptionId,
                    timezone: mockTimezone,
                });
                expect(mockNext).toHaveBeenCalled();
            });

            it('should throw InternalServerError when renewal fails', async () => {
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId, planType: 'free' },
                    subscription: {
                        subscriptionId: mockSubscriptionId,
                        status: 'active',
                        currentPeriodEnd: new Date('2025-12-01'),
                    },
                });

                mockIsBefore.mockReturnValue(true);
                mockCompareIgnoreCapitalization.mockImplementation((a: string, b: string) => {
                    return a?.toLowerCase() === b?.toLowerCase();
                });

                mockProcessRenewal.mockResolvedValue(null);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(InternalServerError);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('re-new subscription fail!');
            });

            it('should handle subscription with EXPIRED status', async () => {
                mockGetUserSubscriptionWithPlan
                    .mockResolvedValueOnce({
                        plan: { planId: mockPlanId, planType: 'premium' },
                        subscription: {
                            subscriptionId: mockSubscriptionId,
                            status: 'expired',
                            currentPeriodEnd: new Date('2025-12-31'),
                        },
                    })
                    .mockResolvedValueOnce({
                        plan: { planId: 2, planType: 'free' },
                        subscription: {
                            subscriptionId: mockSubscriptionId,
                            status: 'active',
                            currentPeriodEnd: new Date('2025-12-31'),
                        },
                    });

                mockIsBefore.mockReturnValue(false);
                mockCompareIgnoreCapitalization.mockImplementation((a: string, b: string) => {
                    return a?.toLowerCase() === b?.toLowerCase();
                });

                mockGetFreePlan.mockResolvedValue({ planId: 2 });
                mockChangeSubscription.mockResolvedValue(true);
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockChangeSubscription).toHaveBeenCalled();
            });
        });

        describe('Feature limit check', () => {
            beforeEach(() => {
                mockIsEmpty.mockReturnValue(false);
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId, planType: 'premium' },
                    subscription: {
                        subscriptionId: mockSubscriptionId,
                        status: 'active',
                        currentPeriodEnd: new Date('2025-12-31'),
                    },
                });
                mockIsBefore.mockReturnValue(false);
            });

            it('should call next() when boolean feature is enabled', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it('should throw PaymentRequire when boolean feature is disabled', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'boolean',
                    isEnabled: false,
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(PaymentRequire);
            });

            it('should call next() when usage feature is within limit', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: '100',
                    isEnabled: true,
                    interval: 'daily',
                });

                mockCheckAndIncrementUsage.mockResolvedValue({
                    exceeded: false,
                    currentUsage: 50,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockCheckAndIncrementUsage).toHaveBeenCalledWith({
                    userId: mockUserId,
                    featureId: mockFeatureId,
                    planId: mockPlanId,
                    subscriptionId: mockSubscriptionId,
                    featureType: 'usage',
                    limitValue: 100,
                    interval: 'daily',
                    timezone: mockTimezone,
                    today: '2025-12-09',
                });
                expect(mockNext).toHaveBeenCalled();
            });

            it('should throw PaymentRequire when usage feature exceeds limit', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: '100',
                    isEnabled: true,
                    interval: 'daily',
                });

                mockCheckAndIncrementUsage.mockResolvedValue({
                    exceeded: true,
                    currentUsage: 100,
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(PaymentRequire);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('You have exceeded your feature usage limit');
            });

            it('should throw InternalServerError when usage feature has no numeric value', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: null,
                    isEnabled: true,
                    interval: 'daily',
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(InternalServerError);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('Numeric value is required for usage-based features');
            });

            it('should throw InternalServerError when usage feature has zero or negative limit', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: '0',
                    isEnabled: true,
                    interval: 'daily',
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(InternalServerError);

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow('Feature limit value must be greater than zero');
            });

            it('should throw InternalServerError when usage feature has negative limit', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: '-10',
                    isEnabled: true,
                    interval: 'daily',
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(InternalServerError);
            });

            it('should return !isEnabled for unknown feature types', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'unknown',
                    isEnabled: false,
                });

                await expect(
                    subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
                ).rejects.toThrow(PaymentRequire);
            });

            it('should call next() for unknown feature types when isEnabled is true', async () => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'unknown',
                    isEnabled: true,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Different intervals for usage features', () => {
            beforeEach(() => {
                mockIsEmpty.mockReturnValue(false);
                mockGetUserSubscriptionWithPlan.mockResolvedValue({
                    plan: { planId: mockPlanId, planType: 'premium' },
                    subscription: {
                        subscriptionId: mockSubscriptionId,
                        status: 'active',
                        currentPeriodEnd: new Date('2025-12-31'),
                    },
                });
                mockIsBefore.mockReturnValue(false);
                mockCheckAndIncrementUsage.mockResolvedValue({
                    exceeded: false,
                    currentUsage: 50,
                });
            });

            it.each(['daily', 'weekly', 'monthly', 'yearly'])('should handle %s interval correctly', async interval => {
                mockGetFeatureAbilityOfPlan.mockResolvedValue({
                    featureType: 'usage',
                    numericValue: '100',
                    isEnabled: true,
                    interval,
                });

                await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

                expect(mockCheckAndIncrementUsage).toHaveBeenCalledWith(
                    expect.objectContaining({
                        interval,
                    })
                );
                expect(mockNext).toHaveBeenCalled();
            });
        });
    });

    describe('handleDowngradePlan', () => {
        it('should throw InternalServerError when downgrade fails', async () => {
            mockIsEmpty.mockReturnValue(false);
            mockGetUserSubscriptionWithPlan.mockResolvedValue({
                plan: { planId: mockPlanId, planType: 'premium' },
                subscription: {
                    subscriptionId: mockSubscriptionId,
                    status: 'active',
                    currentPeriodEnd: new Date('2025-12-01'),
                },
            });

            mockIsBefore.mockReturnValue(true);
            mockCompareIgnoreCapitalization.mockImplementation((a: string, b: string) => {
                return a?.toLowerCase() === b?.toLowerCase();
            });

            mockGetFreePlan.mockResolvedValue({ planId: 2 });
            mockChangeSubscription.mockResolvedValue(null);

            await expect(
                subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
            ).rejects.toThrow(InternalServerError);

            await expect(
                subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
            ).rejects.toThrow('Down Subscription Fail!');
        });
    });

    describe('Edge cases', () => {
        beforeEach(() => {
            mockIsEmpty.mockReturnValue(false);
        });

        it('should handle request with boundary time difference (exactly 60 seconds)', async () => {
            const serverTime = new Date('2025-12-09T10:00:00Z');
            const clientTime = new Date('2025-12-09T10:01:00Z'); // Exactly 60 seconds

            mockGetSystemDate.mockReturnValue(serverTime);
            mockGetCurrentTimestampFromRequest.mockReturnValue(clientTime);
            mockGetCurrentDateInTimeZone.mockImplementation((tz: string, date?: Date | string) => {
                return date ? new Date(date) : serverTime;
            });

            mockGetUserSubscriptionWithPlan.mockResolvedValue({
                plan: { planId: mockPlanId, planType: 'premium' },
                subscription: {
                    subscriptionId: mockSubscriptionId,
                    status: 'active',
                    currentPeriodEnd: new Date('2025-12-31'),
                },
            });

            mockGetFeatureAbilityOfPlan.mockResolvedValue({
                featureType: 'boolean',
                isEnabled: true,
            });

            // 60 seconds = 60000ms which equals the boundary (should pass)
            await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle request with time difference just over boundary (61 seconds)', async () => {
            const serverTime = new Date('2025-12-09T10:00:00Z');
            const clientTime = new Date('2025-12-09T10:01:01Z'); // 61 seconds

            mockGetSystemDate.mockReturnValue(serverTime);
            mockGetCurrentTimestampFromRequest.mockReturnValue(clientTime);
            mockGetCurrentDateInTimeZone.mockImplementation((tz: string, date?: Date | string) => {
                return date ? new Date(date) : serverTime;
            });

            await expect(
                subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext)
            ).rejects.toThrow(Forbidden);
        });

        it('should handle feature with decimal numeric value', async () => {
            mockGetUserSubscriptionWithPlan.mockResolvedValue({
                plan: { planId: mockPlanId, planType: 'premium' },
                subscription: {
                    subscriptionId: mockSubscriptionId,
                    status: 'active',
                    currentPeriodEnd: new Date('2025-12-31'),
                },
            });

            mockIsBefore.mockReturnValue(false);

            mockGetFeatureAbilityOfPlan.mockResolvedValue({
                featureType: 'usage',
                numericValue: '10.5',
                isEnabled: true,
                interval: 'daily',
            });

            mockCheckAndIncrementUsage.mockResolvedValue({
                exceeded: false,
                currentUsage: 5,
            });

            await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

            expect(mockCheckAndIncrementUsage).toHaveBeenCalledWith(
                expect.objectContaining({
                    limitValue: 10.5,
                })
            );
        });

        it('should handle quota feature type like boolean', async () => {
            mockGetUserSubscriptionWithPlan.mockResolvedValue({
                plan: { planId: mockPlanId, planType: 'premium' },
                subscription: {
                    subscriptionId: mockSubscriptionId,
                    status: 'active',
                    currentPeriodEnd: new Date('2025-12-31'),
                },
            });

            mockIsBefore.mockReturnValue(false);

            mockGetFeatureAbilityOfPlan.mockResolvedValue({
                featureType: 'quota',
                isEnabled: true,
            });

            await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle text feature type like boolean', async () => {
            mockGetUserSubscriptionWithPlan.mockResolvedValue({
                plan: { planId: mockPlanId, planType: 'premium' },
                subscription: {
                    subscriptionId: mockSubscriptionId,
                    status: 'active',
                    currentPeriodEnd: new Date('2025-12-31'),
                },
            });

            mockIsBefore.mockReturnValue(false);

            mockGetFeatureAbilityOfPlan.mockResolvedValue({
                featureType: 'text',
                isEnabled: true,
            });

            await subscriptionMiddleware.handleSubscription(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});

//   SubscriptionMiddleware
//     handleSubscription
//       Time validation
//         √ should throw Forbidden when client time is too far from server time (8 ms)
//         √ should not throw when client and server time difference is within allowed boundary (1 ms)
//       Feature validation
//         √ should throw BadRequest when featureId is missing (1 ms)
//       User plan validation
//         √ should throw NotFoundError when user plan is not found (1 ms)
//         √ should throw NotFoundError when plan is empty (1 ms)
//         √ should throw NotFoundError when subscription is empty
//       Subscription expiration handling
//         √ should downgrade plan when non-free plan is expired (1 ms)
//         √ should renew subscription when free plan is expired (1 ms)
//         √ should throw InternalServerError when renewal fails (1 ms)
//         √ should handle subscription with EXPIRED status (1 ms)
//       Feature limit check
//         √ should call next() when boolean feature is enabled
//         √ should throw PaymentRequire when boolean feature is disabled
//         √ should call next() when usage feature is within limit
//         √ should throw PaymentRequire when usage feature exceeds limit (1 ms)
//         √ should throw InternalServerError when usage feature has no numeric value (1 ms)
//         √ should throw InternalServerError when usage feature has zero or negative limit (1 ms)
//         √ should throw InternalServerError when usage feature has negative limit (1 ms)
//         √ should return !isEnabled for unknown feature types
//         √ should call next() for unknown feature types when isEnabled is true
//       Different intervals for usage features
//         √ should handle daily interval correctly (4 ms)
//         √ should handle weekly interval correctly
//         √ should handle monthly interval correctly
//         √ should handle yearly interval correctly (1 ms)
//     handleDowngradePlan
//       √ should throw InternalServerError when downgrade fails (2 ms)
//     Edge cases
//       √ should handle request with boundary time difference (exactly 60 seconds)
//       √ should handle request with time difference just over boundary (61 seconds)
//       √ should handle feature with decimal numeric value
//       √ should handle quota feature type like boolean
//       √ should handle text feature type like boolean
