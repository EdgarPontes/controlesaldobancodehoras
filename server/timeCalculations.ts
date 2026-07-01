/**
 * Time calculation utilities for the time tracking system.
 * Handles conversion between HH:MM:SS format and minutes.
 */

/**
 * Convert HH:MM:SS string to minutes
 * Returns null if the format is invalid or empty
 */
export function timeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Handle HH:MM:SS or HH:MM format
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  try {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    if (hours < 0 || minutes < 0 || seconds < 0) return null;
    if (hours > 24 || minutes >= 60 || seconds >= 60) return null;

    return hours * 60 + minutes + Math.round(seconds / 60);
  } catch {
    return null;
  }
}

/**
 * Convert minutes to HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Calculate worked hours from time entries
 * Pairs: time1-time2 (morning), time3-time4 (afternoon), time5-time6 (extra)
 */
export function calculateWorkedMinutes(
  time1: string | null | undefined,
  time2: string | null | undefined,
  time3: string | null | undefined,
  time4: string | null | undefined,
  time5: string | null | undefined,
  time6: string | null | undefined
): number {
  let totalMinutes = 0;

  // Morning shift: time1 to time2
  if (time1 && time2) {
    const t1 = timeToMinutes(time1);
    const t2 = timeToMinutes(time2);
    if (t1 !== null && t2 !== null && t2 > t1) {
      totalMinutes += t2 - t1;
    }
  }

  // Afternoon shift: time3 to time4
  if (time3 && time4) {
    const t3 = timeToMinutes(time3);
    const t4 = timeToMinutes(time4);
    if (t3 !== null && t4 !== null && t4 > t3) {
      totalMinutes += t4 - t3;
    }
  }

  // Extra shift: time5 to time6
  if (time5 && time6) {
    const t5 = timeToMinutes(time5);
    const t6 = timeToMinutes(time6);
    if (t5 !== null && t6 !== null && t6 > t5) {
      totalMinutes += t6 - t5;
    }
  }

  return totalMinutes;
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.getUTCDay();
}

/**
 * Check if a date is Saturday
 */
export function isSaturday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 6;
}

/**
 * Check if a date is Sunday
 */
export function isSunday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 0;
}

/**
 * Check if a date is a weekday (Monday-Friday)
 */
export function isWeekday(dateStr: string): boolean {
  const day = getDayOfWeek(dateStr);
  return day >= 1 && day <= 5;
}

/**
 * Calculate daily balance in minutes
 * Returns worked minutes - expected minutes (can be negative)
 */
export function calculateDailyBalance(
  workedMinutes: number,
  expectedMinutes: number,
  dayType: string
): number {
  // If it's a holiday, leave, or justified absence, no balance calculation
  if (dayType !== "normal") {
    return 0;
  }

  return workedMinutes - expectedMinutes;
}

/**
 * Get expected work minutes for a day
 * Returns 0 for Sundays (non-working day)
 */
export function getExpectedMinutes(
  dateStr: string,
  weekdayHours: number,
  saturdayHours: number
): number {
  if (isSunday(dateStr)) {
    return 0; // Sunday is not a working day
  }
  
  const isSat = isSaturday(dateStr);
  const hours = isSat ? saturdayHours : weekdayHours;
  return hours * 60;
}

/**
 * Parse date string in YYYY-MM-DD format
 */
export function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of a month
 */
export function getFirstDayOfMonth(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return formatDate(date);
}

/**
 * Get the last day of a month
 */
export function getLastDayOfMonth(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return formatDate(date);
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
