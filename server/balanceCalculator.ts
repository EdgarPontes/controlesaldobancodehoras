/**
 * Service for calculating monthly and daily balances
 */

import {
  calculateWorkedMinutes,
  calculateDailyBalance,
  getExpectedMinutes,
  getDaysInMonth,
  formatDate,
  parseDate,
} from "./timeCalculations";
import type { TimeEntry, WorkSettings } from "../drizzle/schema";

export interface DayBalance {
  date: string;
  dayOfWeek: number;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
  dayType: string;
  times: (string | null)[];
}

export interface MonthlyBalance {
  year: number;
  month: number;
  days: DayBalance[];
  totalBalanceMinutes: number;
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
}

/**
 * Calculate balance for a specific day
 */
export function calculateDayBalance(
  entry: TimeEntry | null,
  date: string,
  workSettings: WorkSettings
): DayBalance {
  const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();

  const workedMinutes = entry
    ? calculateWorkedMinutes(entry.time1, entry.time2, entry.time3, entry.time4, entry.time5, entry.time6)
    : 0;

  const expectedMinutes = getExpectedMinutes(
    date,
    workSettings.weekdayHours,
    workSettings.saturdayHours
  );

  const dayType = entry?.dayType || "normal";
  const balanceMinutes = calculateDailyBalance(workedMinutes, expectedMinutes, dayType);

  return {
    date,
    dayOfWeek,
    workedMinutes,
    expectedMinutes,
    balanceMinutes,
    dayType,
    times: [entry?.time1 || null, entry?.time2 || null, entry?.time3 || null, entry?.time4 || null, entry?.time5 || null, entry?.time6 || null],
  };
}

/**
 * Calculate monthly balance from time entries
 */
export function calculateMonthlyBalance(
  year: number,
  month: number,
  entries: TimeEntry[],
  workSettings: WorkSettings
): MonthlyBalance {
  const days: DayBalance[] = [];

  let totalBalanceMinutes = 0;
  let totalWorkedMinutes = 0;
  let totalExpectedMinutes = 0;

  const entriesByDate = new Map<string, TimeEntry>();
  entries.forEach(entry => {
    entriesByDate.set(entry.date, entry);
  });

  const relevantDates = entries
    .map(entry => entry.date)
    .sort((a, b) => a.localeCompare(b));

  relevantDates.forEach(dateStr => {
    const entry = entriesByDate.get(dateStr) || null;
    const hasAnyTime = [entry?.time1, entry?.time2, entry?.time3, entry?.time4, entry?.time5, entry?.time6].some(Boolean);
    const hasSpecialDayType = entry?.dayType && entry.dayType !== "normal";
    const hasNotes = Boolean(entry?.notes);

    if (!hasAnyTime && !hasSpecialDayType && !hasNotes) {
      return;
    }

    const dayBalance = calculateDayBalance(entry, dateStr, workSettings);
    days.push(dayBalance);

    totalBalanceMinutes += dayBalance.balanceMinutes;
    totalWorkedMinutes += dayBalance.workedMinutes;
    totalExpectedMinutes += dayBalance.expectedMinutes;
  });

  return {
    year,
    month,
    days,
    totalBalanceMinutes,
    totalWorkedMinutes,
    totalExpectedMinutes,
  };
}

/**
 * Format balance for display (HH:MM format)
 */
export function formatBalance(minutes: number): string {
  const isNegative = minutes < 0;
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  const sign = isNegative ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Get balance status for styling
 */
export function getBalanceStatus(minutes: number): "positive" | "negative" | "neutral" {
  if (minutes > 0) return "positive";
  if (minutes < 0) return "negative";
  return "neutral";
}

/**
 * Calculate cumulative balance across multiple months
 */
export function calculateCumulativeBalance(monthlyBalances: MonthlyBalance[]): number {
  return monthlyBalances.reduce((sum, month) => sum + month.totalBalanceMinutes, 0);
}
