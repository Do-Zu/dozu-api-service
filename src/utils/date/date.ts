import { Request } from 'express';
import { format, isBefore } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { isValidTimezone } from './validate';

type DateFormatType = 'ISO' | 'US' | 'EU' | 'CUSTOM';

/**
 * Formats a Date object to a YYYY-MM-DD string.
 * Uses ISO string and truncates time portion.
 *
 * @param date - The date to format
 * @returns A string in YYYY-MM-DD format
 */
export function getDateFormatted(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
    return format(date, formatStr);
}

/**
 * Adds a specified number of days to a given date.
 * Works with both Date objects and date strings.
 *
 * @param date - The starting date
 * @param days - Number of days to add (can be negative for subtraction)
 * @returns A new Date object with days added
 */
export function getDateAdded(date: Date | string, days: number): Date {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Formats a date showing year, month, and day according to the specified timezone and format.
 * Uses 2-digit padding for month and day.
 *
 * @param date - The date to format
 * @param timeZone - The timezone to use for formatting (defaults to UTC)
 * @param formatType - The format type: 'ISO' (YYYY-MM-DD), 'US' (MM/DD/YYYY), 'EU' (DD/MM/YYYY), 'CUSTOM'
 * @param customLocale - Custom locale when formatType is 'CUSTOM' (defaults to 'en-US')
 * @returns A formatted date string in the specified format
 * @throws Error if the date is invalid
 */
export function getDateFormattedWithTimeZone(
    date: Date | string,
    timeZone: string = 'UTC',
    formatType: DateFormatType = 'ISO',
    customLocale?: string
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date: ${date}`);
    }

    const options: Intl.DateTimeFormatOptions = {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };

    let locale: string;

    switch (formatType) {
        case 'ISO':
            locale = 'en-CA'; // Returns YYYY-MM-DD format
            break;
        case 'US':
            locale = 'en-US'; // Returns MM/DD/YYYY format
            break;
        case 'EU':
            locale = 'en-GB'; // Returns DD/MM/YYYY format
            break;
        case 'CUSTOM':
            locale = customLocale || 'en-US';
            break;
        default:
            locale = 'en-CA'; // Default to ISO format
    }

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Formats a date to a string in HH:MM format (24-hour clock).
 * Uses locale settings for consistent formatting.
 *
 * @param date - The date to format
 * @returns A string in HH:MM format
 */
export function formatTimeToHHMM(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Extracts and formats only the time portion of a date in the specified timezone.
 * Returns time in 24-hour format with hours, minutes, and seconds.
 *
 * @param date - The date to extract time from
 * @param timeZone - The timezone to use for formatting (defaults to UTC)
 * @returns A formatted time string like "HH:MM:SS"
 */
export function getTimeUTC(date: Date, timeZone: string = 'UTC'): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a date with time zone information.
 *
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns A string representing the formatted date
 */
export function formatDateWithTimeZone(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...options,
    };

    const formattedDate = new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);

    return formattedDate.replace(',', '');
}

/**
 * Get start of day for the specified date and timezone
 *
 * This is important for date range comparisons within a specific timezone.
 *
 * @param date - The reference date
 * @param timeZone - The timezone to use (defaults to UTC)
 * @returns A Date object set to the start of the day in the specified timezone
 */
export function startOfDay(date: Date | string, timeZone: string = 'UTC'): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    const parts = formatter.formatToParts(dateObj);
    const dateParts: Record<string, number> = {};

    parts.forEach(part => {
        if (['year', 'month', 'day'].includes(part.type)) {
            dateParts[part.type] = parseInt(part.value, 10);
        }
    });

    // Month is 0-indexed in Date constructor
    dateParts.month -= 1;

    return new Date(Date.UTC(dateParts.year, dateParts.month, dateParts.day, 0, 0, 0, 0));
}

/**
 * Get end of day for the specified date and timezone
 *
 * Useful for inclusive date range queries.
 *
 * @param date - The reference date
 * @param timeZone - The timezone to use (defaults to UTC)
 * @returns A Date object set to the end of the day in the specified timezone
 */
export function endOfDay(date: Date | string, timeZone: string = 'UTC'): Date {
    const startDay = startOfDay(date, timeZone);
    return new Date(startDay.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get start of month for the specified date and timezone
 *
 * Sets time to 00:00:00.000 on the first day of the month.
 *
 * @param date - The reference date
 * @param timeZone - The timezone to use (defaults to UTC)
 * @returns A Date object set to the start of the month in the specified timezone
 */
export function startOfMonth(date: Date | string, timeZone: string = 'UTC'): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
    });

    const parts = formatter.formatToParts(dateObj);
    const dateParts: Record<string, number> = {};

    parts.forEach(part => {
        if (['year', 'month'].includes(part.type)) {
            dateParts[part.type] = parseInt(part.value, 10);
        }
    });

    // Month is 0-indexed in Date constructor
    dateParts.month -= 1;

    return new Date(Date.UTC(dateParts.year, dateParts.month, 1, 0, 0, 0, 0));
}

/**
 * Format date with a specific locale and format options
 *
 * Provides flexibility for internationalization needs.
 *
 * @param date - The date to format
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @param options - Formatting options including timezone
 * @returns Locale-specific formatted date string
 */
export function formatDate(
    date: Date | string,
    locale: string = 'en-US',
    options: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Add a specified amount of time to a date
 *
 * Handles various time units from seconds to years.
 * Creates a new Date object instead of modifying the input.
 *
 * Note: This function doesn't account for timezone differences when adding time.
 * For timezone-aware calculations, additional conversion might be needed.
 *
 * @param date - The starting date
 * @param amount - The amount to add (can be negative)
 * @param unit - The time unit to add
 * @returns A new Date with the specified amount added
 */
export function addTime(
    date: Date | string,
    amount: number,
    unit: 'days' | 'hours' | 'minutes' | 'seconds' | 'months' | 'years'
): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date.getTime());

    switch (unit) {
        case 'days':
            dateObj.setDate(dateObj.getDate() + amount);
            break;
        case 'hours':
            dateObj.setHours(dateObj.getHours() + amount);
            break;
        case 'minutes':
            dateObj.setMinutes(dateObj.getMinutes() + amount);
            break;
        case 'seconds':
            dateObj.setSeconds(dateObj.getSeconds() + amount);
            break;
        case 'months':
            dateObj.setMonth(dateObj.getMonth() + amount);
            break;
        case 'years':
            dateObj.setFullYear(dateObj.getFullYear() + amount);
            break;
    }

    return dateObj;
}

/**
 * Get difference between two dates in the specified unit
 *
 * Always returns whole numbers by truncating partial units.
 *
 * Note: This function compares the timestamps directly without
 * considering timezone differences between the dates.
 *
 * @param date1 - The earlier date
 * @param date2 - The later date
 * @param unit - The unit for expressing the difference
 * @returns The difference as a whole number in the specified unit
 */
export function differenceInTime(
    date1: Date | string,
    date2: Date | string,
    unit: 'days' | 'hours' | 'minutes' | 'seconds'
): number {
    const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;

    const diffMs = dateObj2.getTime() - dateObj1.getTime();

    switch (unit) {
        case 'days':
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case 'hours':
            return Math.floor(diffMs / (1000 * 60 * 60));
        case 'minutes':
            return Math.floor(diffMs / (1000 * 60));
        case 'seconds':
            return Math.floor(diffMs / 1000);
        default:
            return diffMs;
    }
}

/**
 * Gets the day of the week from a date with comprehensive validation
 * @param date - The date to get the day of the week from (Date object, string, or number timestamp)
 * @param locale - Optional locale for localized day names (defaults to 'en-US')
 * @param timeZone - Optional timezone to consider when determining the day (defaults to 'UTC')
 * @returns string - The name of the day of the week
 * @throws Error if the date is invalid or cannot be parsed
 */
export function getDayOfWeek(date: Date | string | number, locale: string = 'en-US', timeZone: string = 'UTC'): string {
    let dateObj: Date;

    try {
        if (typeof date === 'string') {
            if (date.trim() === '') {
                throw new Error('Empty string is not a valid date');
            }
            dateObj = new Date(date);
        } else if (typeof date === 'number') {
            // Handle timestamp (both seconds and milliseconds)
            // If number is less than year 2001 in milliseconds, assume it's in seconds
            const timestamp = date < 1000000000000 ? date * 1000 : date;
            dateObj = new Date(timestamp);
        } else if (date instanceof Date) {
            dateObj = new Date(date.getTime());
        } else {
            throw new Error(`Invalid date type: expected Date, string, or number, got ${typeof date}`);
        }

        if (isNaN(dateObj.getTime())) {
            throw new Error(`Invalid date value: "${date}" could not be parsed as a valid date`);
        }

        if (!isValidTimezone(timeZone)) {
            throw new Error(`Invalid timezone: "${timeZone}"`);
        }

        // Use Intl.DateTimeFormat for timezone-aware day calculation
        const formatter = new Intl.DateTimeFormat(locale, {
            weekday: 'long',
            timeZone: timeZone,
        });

        return formatter.format(dateObj);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get day of week: ${error.message}`);
        }
        throw new Error(`Failed to get day of week for date: ${date}`);
    }
}

export function getCurrentTimestampFromRequest(req: Request): string {
    const result = req.headers['x-timestamp'] as string;
    if (!result) {
        throw new Error('Failed to get Current Date');
    }
    return result;
}

export function getCurrentDateFromRequest(req: Request): string {
    return getDateFormatted(getCurrentTimestampFromRequest(req));
}

/**
 *
 * @param req - The request object containing headers
 * @description Retrieves the timezone from the request headers.
 * @returns {string} - The timezone string from the request header.
 * @throws {Error} - If the timezone header is missing or invalid.
 */
export function getTimezoneClient(req: Request): string {
    const timeZone = req.headers['x-timezone'] as string;

    if (!timeZone) {
        throw new Error(`missing timezone header: ${timeZone}`);
    }

    if (!isValidTimezone(timeZone)) {
        throw new Error(`Invalid timezone: ${timeZone}`);
    }
    return timeZone;
}

export function getCurrentDateInTimeZone(timeZone: string = 'UTC', date: Date | string = new Date()): Date {
    return toZonedTime(date, timeZone);
}

/**
 * Check if a subscription's current period end date is expired compared to today's date.
 * This function compares the end date with today's date in the specified timezone.
 *  @param currentPeriodEnd - The end date of the subscription period in ISO format (e.g., "2025-05-16T10:00:00+07:00")
 *  @param today - The current date in ISO format (e.g., "2025-05-16T10:00:00+07:00")
 *  @param timezone - The timezone to use for comparison (defaults to 'UTC')
 *  @returns boolean - Returns true if the current period end date is before today's date, indicating it has expired.
 *  If the dates are equal, it returns false, indicating the subscription is still active
 */
export function isExpiredDate(
    currentPeriodEnd: Date | string,
    today: Date | string,
    timezone: string = 'UTC'
): boolean {
    const endDate = getCurrentDateInTimeZone(timezone, currentPeriodEnd);
    const todayDate = getCurrentDateInTimeZone(timezone, today);
    return isBefore(endDate, todayDate);
}

/**
 *  Gets the current UTC date.
 *  This function returns the current date in UTC timezone.
 */
export function getUTCDate(): Date {
    const now = new Date();
    const utcDate = toZonedTime(now, 'UTC');
    return utcDate;
}

/**
 * Gets the current system date.
 * This function returns the current date based on the system's local timezone.
 */
export function getSystemDate(): Date {
    return new Date();
}

/**
 * Compares two dates by normalizing them to UTC timezone.
 * This ensures accurate comparison regardless of the dates' original timezones.
 *
 * @param firstDate - The first date to compare
 * @param secondDate - The second date to compare
 * @returns True if firstDate is before secondDate, false otherwise
 *
 * @example
 * const date1 = new Date('2025-10-19T10:00:00+07:00');
 * const date2 = new Date('2025-10-19T10:00:00Z');
 * compareDates(date1, date2); // returns false (they're equal in UTC)
 *
 * @example
 * const date1 = new Date('2025-10-18T23:00:00+07:00');
 * const date2 = new Date('2025-10-19T10:00:00Z');
 * compareDates(date1, date2); // returns true
 */
export function compareDates(firstDate: Date, secondDate: Date): boolean {
    const firstDateUTC = toZonedTime(firstDate, 'UTC');
    const secondDateUTC = toZonedTime(secondDate, 'UTC');

    return isBefore(firstDateUTC, secondDateUTC);
}

export enum TimeUnit {
    SECOND = 'seconds',
    MINUTE = 'minutes',
    HOUR = 'hours',
    DAY = 'days',
    WEEK = 'weeks',
    MONTH = 'months',
    YEAR = 'years',
}

export const TIME_ZONE_SYSTEM = {
    UTC: 'UTC',
};
