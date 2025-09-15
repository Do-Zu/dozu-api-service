import { isValidISOWithOffset, isValidDate } from './validate';

export const TIMEZONE = {
    UTC: 'UTC',
};

/**
 * Validates client timestamp object format
 *
 * @param data - Object containing timestamp and timezone
 * @returns ValidationResult with success status and any error message
 */
export function validateClientTimestamp(data: { timestamp?: string; timezone?: string }): {
    isValid: boolean;
    message?: string;
} {
    if (!data) {
        return { isValid: false, message: 'Timestamp data is required' };
    }

    if (!data.timestamp) {
        return { isValid: false, message: 'Timestamp is required' };
    }

    if (!isValidISOWithOffset(data.timestamp)) {
        return { isValid: false, message: 'Invalid timestamp format. Expected ISO 8601 with offset' };
    }

    if (!data.timezone) {
        return { isValid: false, message: 'Timezone is required' };
    }

    try {
        // Check if timezone is valid by attempting to use it
        Intl.DateTimeFormat('en-US', { timeZone: data.timezone });
        return { isValid: true };
    } catch {
        return { isValid: false, message: `Invalid timezone: ${data.timezone}` };
    }
}

/**
 * Converts client timestamp data to UTC Date object for database storage
 * Handles ISO timestamps with offset and timezone information
 *
 * @param data - Object containing timestamp and timezone from client
 * @returns Date object normalized to UTC
 */
export function clientTimestampToUTC(data: { timestamp: string; timezone: string }): Date {
    // Validate the input
    const validation = validateClientTimestamp(data);
    if (!validation.isValid) {
        throw new Error(validation.message);
    }

    // Parse the ISO string with offset directly
    const date = new Date(data.timestamp);

    // The date is now in UTC internally, but we should verify against the provided timezone
    // to ensure consistency between the offset and timezone

    // Get the provided offset from the timestamp string
    const offsetMatch = data.timestamp.match(/([+-]\d{2}:\d{2})$/);
    if (!offsetMatch) {
        throw new Error('Could not extract offset from timestamp');
    }

    // Get what the offset should be for the provided timezone
    const calculatedOffset = getTimezoneOffsetString(data.timezone, date);

    // If offsets don't match, there's an inconsistency between timezone and offset
    if (offsetMatch[1] !== calculatedOffset) {
        // Rather than error, we'll use the timezone as the source of truth
        // Convert the timestamp from the specified timezone to UTC
        return convertTimezone(date, data.timezone, 'UTC');
    }

    return date;
}

/**
 * Formats UTC database timestamp to client timezone
 *
 * @param utcDate - UTC date from database
 * @param clientTimezone - Client's timezone
 * @returns Object with ISO timestamp with offset and timezone
 */
export function generateTimestampWithTimezone(
    utcDate: Date = new Date(),
    clientTimezone: string
): {
    timestamp: string;
    timezone: string;
} {
    // Validate the timezone
    try {
        Intl.DateTimeFormat('en-US', { timeZone: clientTimezone });
    } catch {
        throw new Error(`Invalid timezone: ${clientTimezone}`);
    }

    // Convert UTC database time to client timezone
    const clientDate = convertTimezone(utcDate, 'UTC', clientTimezone);

    // Get offset for the client timezone
    const offsetStr = getTimezoneOffsetString(clientTimezone, clientDate);

    // Create ISO string with correct offset (without the Z)
    const localISO = clientDate.toISOString().slice(0, -1);
    const isoWithOffset = `${localISO}${offsetStr}`;

    return {
        timestamp: isoWithOffset,
        timezone: clientTimezone,
    };
}

/**
 * Gets timezone offset string in ISO format (+/-HH:MM)
 *
 * @param timeZone - Timezone to calculate offset for
 * @param date - Date to calculate offset at
 * @returns Formatted offset string like "+07:00" or "-05:00"
 */
export function getTimezoneOffsetString(timeZone: string, date: Date = new Date()): string {
    // Get offset in minutes between local and UTC
    const offsetInMs = getTimezoneOffset(timeZone, date);
    const offsetMinutes = offsetInMs / (60 * 1000);

    // Format the offset string
    const sign = offsetMinutes > 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');

    return `${sign}${hours}:${minutes}`;
}

/**
 * Retrieves a timestamp from the database and formats it for the client
 *
 * Converts the UTC database timestamp to the client's timezone with
 * the correct offset.
 *
 * @param dbTimestamp - UTC Date from database
 * @param clientTimezone - Client's timezone preference
 * @returns Formatted object with timestamp and timezone for client
 */
export function retrieveTimestampForClient(
    dbTimestamp: Date,
    clientTimezone: string
): { timestamp: string; timezone: string } {
    if (!isValidDate(dbTimestamp)) {
        throw new Error('Invalid database timestamp');
    }

    return generateTimestampWithTimezone(dbTimestamp, clientTimezone);
}

/**
 * Convert a date from one timezone to another
 *
 * Algorithm:
 * 1. Parse the date components in the source timezone
 * 2. Create a UTC date with those components
 * 3. Apply timezone offset difference to get the correct time in target timezone
 *
 * @param date - The date to convert
 * @param fromTz - Source timezone (e.g., 'America/New_York')
 * @param toTz - Target timezone (e.g., 'Europe/London')
 * @returns A new Date object representing the same wall-clock time in the target timezone
 */
export function convertTimezone(date: Date | string, fromTz: string, toTz: string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Create formatter for source timezone
    const fromFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: fromTz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });

    // Get parts from source timezone
    const parts = fromFormatter.formatToParts(dateObj);
    const dateParts: Record<string, number> = {};

    // Extract date parts
    parts.forEach(part => {
        if (['year', 'month', 'day', 'hour', 'minute', 'second'].includes(part.type)) {
            dateParts[part.type] = parseInt(part.value, 10);
        }
    });

    // If month is provided, adjust it (months are 0-indexed in Date constructor)
    if (dateParts.month) {
        dateParts.month -= 1;
    }

    // Create a new date in target timezone
    const targetDate = new Date(
        Date.UTC(dateParts.year, dateParts.month, dateParts.day, dateParts.hour, dateParts.minute, dateParts.second)
    );

    // Calculate the offset between timezones
    const targetTzOffset = getTimezoneOffset(toTz, targetDate);
    const sourceTzOffset = getTimezoneOffset(fromTz, dateObj);
    const offsetDiff = targetTzOffset - sourceTzOffset;

    // Apply offset
    targetDate.setMilliseconds(targetDate.getMilliseconds() - offsetDiff);

    return targetDate;
}

/**
 * Get timezone offset in milliseconds for a specific timezone and date
 *
 * This is crucial for timezone conversions because timezone offsets can vary based on:
 * - The specific date (due to daylight saving time changes)
 * - The timezone rules which can change over time
 *
 * @param timeZone - The timezone to get offset for (e.g., 'America/Chicago')
 * @param date - The date to check offset for (defaults to now)
 * @returns The offset in milliseconds between UTC and the specified timezone
 */
export function getTimezoneOffset(timeZone: string, date: Date = new Date()): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return utcDate.getTime() - tzDate.getTime();
}

/**
 * Format a date to ISO string with timezone consideration
 *
 * This differs from standard toISOString() which always uses UTC.
 *
 * @param date - The date to format
 * @param timeZone - The timezone to use (defaults to UTC)
 * @returns ISO-8601 string representing the date in the specified timezone
 */
export function toISOStringWithTimezone(date: Date, timeZone: string = 'UTC'): string {
    const tzDate = convertTimezone(date, Intl.DateTimeFormat().resolvedOptions().timeZone, timeZone);
    return tzDate.toISOString();
}

/**
 * Converts seconds to milliseconds
 *
 * @param seconds - Number of seconds to convert
 * @returns Equivalent milliseconds
 */
export function convertMinuteToMillisecond(minutes: number): number {
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
        throw new Error('Invalid input: minutes must be a non-negative number');
    }
    return minutes * 60 * 1000;
}
