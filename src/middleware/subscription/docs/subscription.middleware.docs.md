# Subscription Middleware Refactor — Design & Implementation

This document explains the refactored subscription middleware solution, its structure, responsibilities, and how to extend and test it. The goals are readability, robustness, and adherence to SOLID principles.

## Core Principles

- **Single Responsibility:** Each validator handles one concern: time sync, subscription state, or feature limits. The middleware orchestrates them.
- **Open/Closed:** Add new validators or feature types without modifying existing orchestrator logic.
- **Liskov Substitution:** Validators expose consistent contracts; alternate implementations can be swapped in.
- **Interface Segregation:** Small context interfaces (`ISubscriptionContext`, `IFeatureLimitContext`) keep dependencies minimal.
- **Dependency Inversion:** Middleware depends on abstractions (validators) rather than service implementations directly.

## Folder Structure

```
src/middleware/subscription/
├── index.ts                           # Barrel exports
├── subscript.middleware.ts            # Orchestrator (Express middleware)
├── constants/
│   └── subscription.constants.ts      # Shared constants & messages
├── types/
│   └── subscription.types.ts          # Context & model interfaces
└── validators/
    ├── index.ts                       # Validator exports
    ├── time.validator.ts              # Client/server time validation
    ├── subscription.validator.ts      # Expiration handling (renew/downgrade)
    └── featureLimit.validator.ts      # Feature limit checks
```

## Roles & Responsibilities

- `subscript.middleware.ts`

    - Orchestrates the flow: time validation → subscription validation → feature limit check → next()
    - Extracts request context (`userId`, `timezone`, `today`) and validates `featureId`.
    - Throws `PaymentRequire` when feature usage exceeds plan limits.

- `validators/time.validator.ts`

    - Validates client-server time drift within `MAX_TIME_DIFF_MS`.
    - Throws `Forbidden` with `ERROR_MESSAGES.CLIENT_TIME_MISMATCH` on violation.

- `validators/subscription.validator.ts`

    - Loads user plan + subscription.
    - Detects expiration via period end date or status.
    - If plan is free: renews period (updates start/end).
    - If not free: downgrades to free plan (status `EXPIRED`).
    - Returns the up-to-date plan/subscription for the current request.

- `validators/featureLimit.validator.ts`

    - Fetches feature ability by plan.
    - `boolean` type: access on/off.
    - `usage` type: enforces a numeric limit over an interval (`daily`, `weekly`, `monthly`, `yearly`, `lifetime`).
    - Delegates increment/check to `featureUsageService`.

- `constants/subscription.constants.ts`

    - Centralizes: time threshold, free plan type, feature types, and error messages.

- `types/subscription.types.ts`
    - Defines contexts and models used across validators.

## Middleware Flow

1. **Extract Context**

    - `userId` from auth
    - `timezone` from request
    - `today` derived via `getCurrentDateInTimeZone` + `getDateFormatted`

2. **Time Validation**

    - Compares server UTC vs client UTC from request timestamp.
    - Enforces max drift (default: 60s).

3. **Subscription Validation**

    - Loads plan/subscription.
    - If expired: renew (free) or downgrade (paid → free).
    - Re-destructures to use updated plan/subscription in the same request.

4. **Feature Limit Check**
    - Evaluates plan feature type.
    - If exceeded: throws `PaymentRequire` with guidance to upgrade.

## Extensibility

- **Add a new feature type**

    - Update `FEATURE_USAGE_TYPE` with the new type.
    - Extend `FeatureLimitChecker.evaluateFeatureLimit` with a new branch.
    - Implement a helper method to enforce the type’s rules.

- **Change time drift policy**

    - Adjust `SUBSCRIPTION_CONSTANTS.MAX_TIME_DIFF_MS` or inject a different value into `TimeValidator`.

- **Alter renewal/downgrade rules**
    - Evolve `SubscriptionValidator` logic while keeping the orchestrator untouched.

## Error Messages & Consistency

- Use `ERROR_MESSAGES` for consistent user-facing messages:
    - `CLIENT_TIME_MISMATCH`, `FEATURE_REQUIRED`, `USER_PLAN_NOT_FOUND`, `RENEWAL_FAILED`, `DOWNGRADE_FAILED`, `FEATURE_LIMIT_EXCEEDED`, `NUMERIC_VALUE_REQUIRED`, `INVALID_LIMIT_VALUE`.

## Testing Guidance

- **Unit tests** (mock services):

    - `TimeValidator`: client vs server time drift boundaries.
    - `SubscriptionValidator`: expired vs active, free vs paid paths.
    - `FeatureLimitChecker`: boolean enablement, usage increment and threshold crossing.

    - npm test -- --testPathPatterns="subscript.middleware.test.ts" --verbose

- **Integration tests**:

    - Full middleware with mocked request and services: ensure flow errors and `next()` work.
    - Verify re-destructuring after renewal/downgrade updates `planId` & `subscriptionId`.

- **Edge cases**:
    - Missing `featureId` → `BadRequest`.
    - No plan/subscription → `NotFoundError`.
    - Renewal/downgrade service failures → `InternalServerError`.

## Quick Reference

- Import orchestrator: `import subscriptionMiddleware from '@/middleware/subscription/subscript.middleware';`
- Attach to route: `router.post('/feature/action', subscriptionMiddleware.handleSubscription, controllerAction);`
- Add new validators without changing `subscript.middleware.ts` by exporting them from `validators/index.ts`.

---

This architecture keeps each concern focused and replaceable, enabling easier maintenance and future growth without risking regressions in unrelated areas.
