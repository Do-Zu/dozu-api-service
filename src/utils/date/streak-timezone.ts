import { convertTimezone } from './timezone';

/**
 * Get the start of day in a specific timezone
 * @param timezone - The timezone to use (e.g., 'America/New_York')
 * @param date - The date to get start of day for (defaults to now)
 * @returns Date object representing start of day in the specified timezone
 */
export function getStartOfDayInTimezone(timezone: string, date: Date = new Date()): Date {
  // Convert the current date to the target timezone
  const tzDate = convertTimezone(date, 'UTC', timezone);
  
  // Set to start of day (00:00:00.000)
  tzDate.setHours(0, 0, 0, 0);
  
  // Convert back to UTC for database storage
  return convertTimezone(tzDate, timezone, 'UTC');
}

/**
 * Get the end of day in a specific timezone
 * @param timezone - The timezone to use (e.g., 'America/New_York')
 * @param date - The date to get end of day for (defaults to now)
 * @returns Date object representing end of day in the specified timezone
 */
export function getEndOfDayInTimezone(timezone: string, date: Date = new Date()): Date {
  // Convert the current date to the target timezone
  const tzDate = convertTimezone(date, 'UTC', timezone);
  
  // Set to end of day (23:59:59.999)
  tzDate.setHours(23, 59, 59, 999);
  
  // Convert back to UTC for database storage
  return convertTimezone(tzDate, timezone, 'UTC');
}

/**
 * Get yesterday's date in a specific timezone
 * @param timezone - The timezone to use (e.g., 'America/New_York')
 * @param date - The date to get yesterday for (defaults to now)
 * @returns Date object representing yesterday in the specified timezone
 */
export function getYesterdayInTimezone(timezone: string, date: Date = new Date()): Date {
  const tzDate = convertTimezone(date, 'UTC', timezone);
  tzDate.setDate(tzDate.getDate() - 1);
  tzDate.setHours(0, 0, 0, 0);
  
  return convertTimezone(tzDate, timezone, 'UTC');
}

/**
 * Check if a date is today in a specific timezone
 * @param date - The date to check
 * @param timezone - The timezone to use (e.g., 'America/New_York')
 * @param referenceDate - The reference date (defaults to now)
 * @returns True if the date is today in the specified timezone
 */
export function isTodayInTimezone(
  date: Date, 
  timezone: string, 
  referenceDate: Date = new Date()
): boolean {
  const startOfToday = getStartOfDayInTimezone(timezone, referenceDate);
  const endOfToday = getEndOfDayInTimezone(timezone, referenceDate);
  
  return date >= startOfToday && date <= endOfToday;
}

/**
 * Check if a date is yesterday in a specific timezone
 * @param date - The date to check
 * @param timezone - The timezone to use (e.g., 'America/New_York')
 * @param referenceDate - The reference date (defaults to now)
 * @returns True if the date is yesterday in the specified timezone
 */
export function isYesterdayInTimezone(
  date: Date, 
  timezone: string, 
  referenceDate: Date = new Date()
): boolean {
  const yesterday = getYesterdayInTimezone(timezone, referenceDate);
  const startOfYesterday = getStartOfDayInTimezone(timezone, yesterday);
  const endOfYesterday = getEndOfDayInTimezone(timezone, yesterday);
  
  return date >= startOfYesterday && date <= endOfYesterday;
}

/**
 * Get user's timezone from study preferences or default to UTC
 * @param studyPreferences - User's study preferences
 * @returns Timezone string
 */
export function getUserTimezone(studyPreferences?: any): string {
  return studyPreferences?.timezone || 'UTC';
}

/**
 * Format a date for display in user's timezone
 * @param date - The date to format
 * @param timezone - The timezone to use
 * @returns Formatted date string
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
