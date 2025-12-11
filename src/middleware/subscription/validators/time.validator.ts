import { Request } from 'express';

import { Forbidden } from '@/core/error';
import {
    getCurrentDateInTimeZone,
    getCurrentTimestampFromRequest,
    getSystemDate,
    TIME_ZONE_SYSTEM,
} from '@/utils/date';
import { SUBSCRIPTION_CONSTANTS, ERROR_MESSAGES } from '../constants/subscription.constants';

/**
 * TimeValidator - Single Responsibility Principle
 * Responsible only for validating client-server time synchronization
 */
export class TimeValidator {
    private readonly maxTimeDifferenceMs: number;

    constructor(maxTimeDifferenceMs: number = SUBSCRIPTION_CONSTANTS.MAX_TIME_DIFF_MS) {
        this.maxTimeDifferenceMs = maxTimeDifferenceMs;
    }

    /**
     * Validates that the client's timestamp is within acceptable range of server time
     * @param req - Express request object
     * @throws Forbidden if time difference exceeds threshold
     */
    public validateClientServerTime(req: Request): void {
        const serverTimeUTC = this.getServerTimeUTC();
        const clientTimeUTC = this.getClientTimeUTC(req);

        const timeDifference = this.calculateTimeDifference(serverTimeUTC, clientTimeUTC);

        if (this.isTimeDifferenceExceeded(timeDifference)) {
            throw new Forbidden(ERROR_MESSAGES.CLIENT_TIME_MISMATCH);
        }
    }

    private getServerTimeUTC(): Date {
        return getCurrentDateInTimeZone(TIME_ZONE_SYSTEM.UTC, getSystemDate());
    }

    private getClientTimeUTC(req: Request): Date {
        const clientTimestamp = getCurrentTimestampFromRequest(req);
        return getCurrentDateInTimeZone(TIME_ZONE_SYSTEM.UTC, clientTimestamp);
    }

    private calculateTimeDifference(serverTime: Date, clientTime: Date): number {
        return Math.abs(serverTime.getTime() - clientTime.getTime());
    }

    private isTimeDifferenceExceeded(timeDifference: number): boolean {
        return timeDifference > this.maxTimeDifferenceMs;
    }
}

export const timeValidator = new TimeValidator();
