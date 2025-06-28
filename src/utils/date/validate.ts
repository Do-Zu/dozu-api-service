import { convertTimezone } from './timezone';

/**
 * Check if a date is between two other dates (inclusive)
 *
 * All dates are converted to the same timezone before comparison to ensure accuracy.
 *
 * @param date - The date to check
 * @param startDate - The beginning of the range
 * @param endDate - The end of the range
 * @param timeZone - The timezone for comparison (defaults to UTC)
 * @returns Boolean indicating if the date is within the range
 */
export function isBetween(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string,
  timeZone: string = 'UTC'
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const dateInTz = convertTimezone(
    dateObj,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZone
  );
  const startInTz = convertTimezone(
    start,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZone
  );
  const endInTz = convertTimezone(end, Intl.DateTimeFormat().resolvedOptions().timeZone, timeZone);

  return dateInTz >= startInTz && dateInTz <= endInTz;
}

/**
 * Check if a date is valid
 *
 * Handles various input types and returns false for null/undefined.
 * Uses getTime() to check if the date is valid (NaN means invalid).
 *
 * @param date - The value to check as a date
 * @returns Boolean indicating if the input can be parsed as a valid date
 */
export function isValidDate(date: Date | string | number | undefined | null): boolean {
  if (date === null || date === undefined) return false;

  const dateObj = date instanceof Date ? date : new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Validates the ISO timestamp with offset format
 * Example: "2025-05-16T10:00:00+07:00"
 *
 * @param timestamp - ISO string with timezone offset
 * @returns Boolean indicating if the timestamp is valid
 */
export function isValidISOWithOffset(timestamp: string): boolean {
  if (!timestamp) return false;

  // ISO 8601 with timezone offset: YYYY-MM-DDTHH:mm:ss.sss+HH:MM or YYYY-MM-DDTHH:mm:ss.sss-HH:MM
  const isoWithOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2})$/;

  if (!isoWithOffsetRegex.test(timestamp)) return false;

  // Further validate the date itself
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Helper function to validate timezone
 */
export function isValidTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
