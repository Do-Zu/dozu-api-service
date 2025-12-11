/**
 * Subscription middleware constants
 * Centralized configuration for subscription handling
 */

export const SUBSCRIPTION_CONSTANTS = {
    /** Maximum allowed time difference between client and server (in milliseconds) */
    MAX_TIME_DIFF_MS: 60 * 1000, // 1 minute

    /** Plan type that should not be downgraded (auto-renews instead) */
    FREE_PLAN_TYPE: 'free',
} as const;

export const FEATURE_USAGE_TYPE = {
    BOOLEAN: 'boolean',
    USAGE: 'usage',
    QUOTA: 'quota',
    TEXT: 'text',
} as const;

export const ERROR_MESSAGES = {
    CLIENT_TIME_MISMATCH: 'Client time is too far from server time. Please check your device clock.',
    FEATURE_REQUIRED: 'Feature is required for subscription check',
    USER_PLAN_NOT_FOUND: 'User plan not found',
    RENEWAL_FAILED: 'Subscription renewal failed',
    DOWNGRADE_FAILED: 'Subscription downgrade failed',
    FEATURE_LIMIT_EXCEEDED: 'You have exceeded your feature usage limit. Please upgrade your subscription.',
    NUMERIC_VALUE_REQUIRED: 'Numeric value is required for usage-based features',
    INVALID_LIMIT_VALUE: 'Feature limit value must be greater than zero',
} as const;

export type FeatureUsageType = (typeof FEATURE_USAGE_TYPE)[keyof typeof FEATURE_USAGE_TYPE];
