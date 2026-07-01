import { describe, expect, it } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  calculateWorkedMinutes,
  isSaturday,
  isSunday,
  calculateDailyBalance,
  getExpectedMinutes,
  formatDate,
  getDaysInMonth,
} from "./timeCalculations";

describe("timeCalculations", () => {
  describe("timeToMinutes", () => {
    it("converts HH:MM:SS format correctly", () => {
      expect(timeToMinutes("08:30:00")).toBe(510); // 8*60 + 30
      expect(timeToMinutes("12:00:00")).toBe(720); // 12*60
      expect(timeToMinutes("00:15:00")).toBe(15);
    });

    it("converts HH:MM format correctly", () => {
      expect(timeToMinutes("08:30")).toBe(510);
      expect(timeToMinutes("12:00")).toBe(720);
    });

    it("handles invalid formats", () => {
      expect(timeToMinutes("")).toBeNull();
      expect(timeToMinutes(null)).toBeNull();
      expect(timeToMinutes(undefined)).toBeNull();
      expect(timeToMinutes("invalid")).toBeNull();
      expect(timeToMinutes("25:00:00")).toBeNull();
      expect(timeToMinutes("12:60:00")).toBeNull();
    });
  });

  describe("minutesToTime", () => {
    it("converts minutes to HH:MM format", () => {
      expect(minutesToTime(510)).toBe("08:30"); // 8*60 + 30
      expect(minutesToTime(720)).toBe("12:00");
      expect(minutesToTime(0)).toBe("00:00");
      expect(minutesToTime(1440)).toBe("24:00");
    });

    it("handles negative minutes", () => {
      expect(minutesToTime(-60)).toBe("-01:00");
      expect(minutesToTime(-30)).toBe("-00:30");
    });
  });

  describe("calculateWorkedMinutes", () => {
    it("calculates single shift correctly", () => {
      // 08:00 to 12:00 = 4 hours = 240 minutes
      const result = calculateWorkedMinutes("08:00:00", "12:00:00", null, null, null, null);
      expect(result).toBe(240);
    });

    it("calculates multiple shifts correctly", () => {
      // Morning: 08:00 to 12:00 = 240 min
      // Afternoon: 13:00 to 18:00 = 300 min
      // Total: 540 min (9 hours)
      const result = calculateWorkedMinutes(
        "08:00:00",
        "12:00:00",
        "13:00:00",
        "18:00:00",
        null,
        null
      );
      expect(result).toBe(540);
    });

    it("calculates with all three shifts", () => {
      // Morning: 08:00 to 12:00 = 240 min
      // Afternoon: 13:00 to 18:00 = 300 min
      // Extra: 19:00 to 20:00 = 60 min
      // Total: 600 min (10 hours)
      const result = calculateWorkedMinutes(
        "08:00:00",
        "12:00:00",
        "13:00:00",
        "18:00:00",
        "19:00:00",
        "20:00:00"
      );
      expect(result).toBe(600);
    });

    it("ignores incomplete shifts", () => {
      // Only time1 without time2
      const result = calculateWorkedMinutes("08:00:00", null, null, null, null, null);
      expect(result).toBe(0);
    });

    it("ignores invalid time pairs", () => {
      // time2 before time1
      const result = calculateWorkedMinutes("12:00:00", "08:00:00", null, null, null, null);
      expect(result).toBe(0);
    });
  });

  describe("isSaturday", () => {
    it("correctly identifies Saturdays", () => {
      expect(isSaturday("2026-07-04")).toBe(true); // July 4, 2026 is Saturday
      expect(isSaturday("2026-07-05")).toBe(false); // July 5, 2026 is Sunday
    });
  });

  describe("calculateDailyBalance", () => {
    it("calculates positive balance", () => {
      // Worked 9 hours, expected 8 hours = +1 hour = +60 minutes
      const result = calculateDailyBalance(540, 480, "normal");
      expect(result).toBe(60);
    });

    it("calculates negative balance", () => {
      // Worked 7 hours, expected 8 hours = -1 hour = -60 minutes
      const result = calculateDailyBalance(420, 480, "normal");
      expect(result).toBe(-60);
    });

    it("returns zero for holidays", () => {
      expect(calculateDailyBalance(0, 480, "holiday")).toBe(0);
      expect(calculateDailyBalance(240, 480, "leave")).toBe(0);
      expect(calculateDailyBalance(300, 480, "justified_absence")).toBe(0);
    });
  });

  describe("isSunday", () => {
    it("correctly identifies Sundays", () => {
      expect(isSunday("2026-07-05")).toBe(true); // July 5, 2026 is Sunday
      expect(isSunday("2026-07-04")).toBe(false); // July 4, 2026 is Saturday
    });
  });

  describe("getExpectedMinutes", () => {
    it("returns weekday hours for weekdays", () => {
      // July 1, 2026 is Tuesday
      expect(getExpectedMinutes("2026-07-01", 8, 4)).toBe(480); // 8 hours
    });

    it("returns Saturday hours for Saturdays", () => {
      // July 4, 2026 is Saturday
      expect(getExpectedMinutes("2026-07-04", 8, 4)).toBe(240); // 4 hours
    });

    it("returns 0 for Sundays", () => {
      // July 5, 2026 is Sunday
      expect(getExpectedMinutes("2026-07-05", 8, 4)).toBe(0); // Sunday is not a working day
    });

    it("respects custom work hours", () => {
      expect(getExpectedMinutes("2026-07-01", 7, 3)).toBe(420); // 7 hours
      expect(getExpectedMinutes("2026-07-04", 7, 3)).toBe(180); // 3 hours
    });
  });

  describe("formatDate", () => {
    it("formats dates correctly", () => {
      const date = new Date(Date.UTC(2026, 6, 1)); // July 1, 2026
      expect(formatDate(date)).toBe("2026-07-01");
    });

    it("pads month and day with zeros", () => {
      const date = new Date(Date.UTC(2026, 0, 5)); // January 5, 2026
      expect(formatDate(date)).toBe("2026-01-05");
    });
  });

  describe("getDaysInMonth", () => {
    it("returns correct days for each month", () => {
      expect(getDaysInMonth(2026, 1)).toBe(31); // January
      expect(getDaysInMonth(2026, 2)).toBe(28); // February (non-leap)
      expect(getDaysInMonth(2026, 4)).toBe(30); // April
      expect(getDaysInMonth(2024, 2)).toBe(29); // February (leap year)
    });
  });
});
