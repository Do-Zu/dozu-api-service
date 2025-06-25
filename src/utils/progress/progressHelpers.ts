import { getDayOfWeek } from '@/utils/date/date';

/**
 * Maps database row result to daily study hours format
 * @param row - Database row containing date and totalMinutes
 * @returns Formatted object with day, hours, and date
 */
export function mapToDailyStudyHours(row: { 
  date: string; 
  totalMinutes: string | number | null; 
}): { day: string; hours: number; date: string } {
  const totalMinutes = Number(row.totalMinutes || 0);
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  
  return {
    day: getDayOfWeek(row.date, 'en-US', 'UTC').substring(0, 3), // Get short day name: 'Sun', 'Mon', etc.
    hours,
    date: row.date, // Already in YYYY-MM-DD format
  };
}

/**
 * Maps array of database rows to daily study hours format
 * @param rows - Array of database rows
 * @returns Array of formatted daily study hours
 */
export function mapToDailyStudyHoursArray(rows: Array<{ 
  date: string; 
  totalMinutes: string | number | null; 
}>): Array<{ day: string; hours: number; date: string }> {
  return rows.map(mapToDailyStudyHours);
}

/**
 * Calculate total hours from minutes with proper rounding
 * @param totalMinutes - Total minutes as string or number
 * @returns Hours rounded to 1 decimal place
 */
export function minutesToHours(totalMinutes: string | number | null): number {
  const minutes = Number(totalMinutes || 0);
  return Math.round((minutes / 60) * 10) / 10;
}
