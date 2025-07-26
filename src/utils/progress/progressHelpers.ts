import { getDayOfWeek, getDateFormatted } from '@/utils/date/date';

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
 * Generate array of last N days with study hours data
 * Fills missing days with 0 hours
 * @param dbRows - Database rows with existing data
 * @param days - Number of days to include (default 7)
 * @returns Complete array of daily study hours for the last N days
 */
export function generateDailyStudyHoursWithEmptyDays(
  dbRows: Array<{ date: string; totalMinutes: string | number | null }>,
  days: number = 7
): Array<{ day: string; hours: number; date: string }> {
  const result: Array<{ day: string; hours: number; date: string }> = [];
  
  // Create a map of existing data for quick lookup
  const dataMap = new Map<string, number>();
  dbRows.forEach(row => {
    const totalMinutes = Number(row.totalMinutes || 0);
    const hours = Math.round((totalMinutes / 60) * 10) / 10;
    dataMap.set(row.date, hours);
  });
  
  // Generate all days in the range - starting from today going backwards
  // This ensures the rightmost column is always "today"
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    // Use local timezone instead of UTC to match user's timezone
    date.setDate(date.getDate() - i);
    const dateString = getDateFormatted(date);
    
    // Use local timezone for day name calculation
    const dayName = getDayOfWeek(dateString, 'en-US').substring(0, 3);
    const hours = dataMap.get(dateString) || 0;
    
    result.push({
      day: dayName,
      hours,
      date: dateString
    });
  }
  
  return result;
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
