/**
 * Formats a Date object to a YYYY-MM-DD string.
 * Uses ISO string and truncates time portion.
 *
 * @param date - The date to format
 * @returns A string in YYYY-MM-DD format
 */
export function getDateFormatted(date: Date): string {
  return date.toISOString().substring(0, 10);
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
 * Formats a date showing year, month, and day according to the specified timezone.
 * Uses 2-digit padding for month and day.
 *
 * @param date - The date to format
 * @param timeZone - The timezone to use for formatting (defaults to UTC)
 * @returns A formatted date string like "MM/DD/YYYY"
 */
export function getDateFormattedWithTimeZone(date: Date, timeZone: string = 'UTC'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
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
export function formatDateWithTimeZone(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
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
