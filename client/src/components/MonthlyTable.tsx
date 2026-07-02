import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DayEntry } from "./DayEntry";
import type { TimeEntry } from "../../../drizzle/schema";

// Utility functions (duplicated from server to avoid server imports in client)
function formatBalance(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Time calculation helpers (mirror server logic)
function timeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
  if (hours < 0 || minutes < 0 || seconds < 0) return null;
  if (hours > 24 || minutes >= 60 || seconds >= 60) return null;
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function calculateWorkedMinutes(
  time1: string | null | undefined,
  time2: string | null | undefined,
  time3: string | null | undefined,
  time4: string | null | undefined,
  time5: string | null | undefined,
  time6: string | null | undefined
): number {
  let totalMinutes = 0;
  if (time1 && time2) {
    const t1 = timeToMinutes(time1);
    const t2 = timeToMinutes(time2);
    if (t1 !== null && t2 !== null && t2 > t1) totalMinutes += t2 - t1;
  }
  if (time3 && time4) {
    const t3 = timeToMinutes(time3);
    const t4 = timeToMinutes(time4);
    if (t3 !== null && t4 !== null && t4 > t3) totalMinutes += t4 - t3;
  }
  if (time5 && time6) {
    const t5 = timeToMinutes(time5);
    const t6 = timeToMinutes(time6);
    if (t5 !== null && t6 !== null && t6 > t5) totalMinutes += t6 - t5;
  }
  return totalMinutes;
}

function getDayOfWeekUTC(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

function isSaturday(dateStr: string): boolean {
  return getDayOfWeekUTC(dateStr) === 6;
}

function isSunday(dateStr: string): boolean {
  return getDayOfWeekUTC(dateStr) === 0;
}

function getExpectedMinutes(dateStr: string, weekdayHours: number, saturdayHours: number): number {
  if (isSunday(dateStr)) return 0;
  const hours = isSaturday(dateStr) ? saturdayHours : weekdayHours;
  return hours * 60;
}

function calculateDailyBalance(workedMinutes: number, expectedMinutes: number, dayType: string): number {
  if (dayType !== "normal") return 0;
  return workedMinutes - expectedMinutes;
}

function getBalanceStatus(minutes: number): "positive" | "negative" | "neutral" {
  if (minutes > 0) return "positive";
  if (minutes < 0) return "negative";
  return "neutral";
}

interface MonthlyTableProps {
  year: number;
  month: number;
  entries: TimeEntry[];
  weekdayHours: number;
  saturdayHours: number;
  totalBalance: number;
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function MonthlyTable({
  year,
  month,
  entries,
  weekdayHours,
  saturdayHours,
  totalBalance,
}: MonthlyTableProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Create a map of entries by date
  const entriesByDate = new Map<string, TimeEntry>();
  entries.forEach((entry) => {
    entriesByDate.set(entry.date, entry);
  });

  // Get number of days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Get first day of month
  const firstDay = new Date(year, month - 1, 1).getDay();

  // Create grid of days
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  if (selectedDate) {
    const editingEntry = entriesByDate.get(selectedDate);
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedDate(null)}>
          ← Voltar para calendário
        </Button>
        <DayEntry
          date={selectedDate}
          dayOfWeek={new Date(selectedDate + "T00:00:00Z").getUTCDay()}
          initialData={editingEntry ? {
            time1: editingEntry.time1,
            time2: editingEntry.time2,
            time3: editingEntry.time3,
            time4: editingEntry.time4,
            time5: editingEntry.time5,
            time6: editingEntry.time6,
            dayType: editingEntry.dayType || "normal",
            notes: editingEntry.notes,
          } : undefined}
          weekdayHours={weekdayHours}
          saturdayHours={saturdayHours}
          onClose={() => {
            setSelectedDate(null);
            // Refresh entries after save
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry = entriesByDate.get(dateStr);
          const dayOfWeek = new Date(dateStr + "T00:00:00Z").getUTCDay();
          const isSunday = dayOfWeek === 0;

          // Calculate balance for this day
          let dayBalance = 0;
          let workedMinutes = 0;
          let expectedMinutes = 0;
          const dayType = entry?.dayType || "normal";
          if (entry) {
            workedMinutes = calculateWorkedMinutes(entry.time1, entry.time2, entry.time3, entry.time4, entry.time5, entry.time6);
            expectedMinutes = getExpectedMinutes(dateStr, weekdayHours, saturdayHours);
            dayBalance = calculateDailyBalance(workedMinutes, expectedMinutes, dayType);
          }

          const balanceStatus = getBalanceStatus(dayBalance);

          return (
            <Button
              key={day}
              variant="outline"
              onClick={() => handleDayClick(day)}
              className={`aspect-square h-auto p-2 flex flex-col items-center justify-center text-xs rounded-lg transition-colors ${
                isSunday
                  ? "bg-slate-100 dark:bg-slate-800 cursor-default"
                  : entry
                  ? balanceStatus === "positive"
                    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    : balanceStatus === "negative"
                    ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    : "bg-slate-50 dark:bg-slate-900"
                  : ""
              }`}
              disabled={isSunday}
            >
              <div className="font-semibold text-slate-900 dark:text-white">{day}</div>
              {entry && (
                <div
                  className={`text-xs font-mono ${
                    balanceStatus === "positive"
                      ? "text-green-600 dark:text-green-400"
                      : balanceStatus === "negative"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {entry.dayType !== "normal" ? (
                    <span className="text-xs">
                      {entry.dayType === "holiday"
                        ? "Feriado"
                        : entry.dayType === "leave"
                        ? "Folga"
                        : "Ausência"}
                    </span>
                  ) : (
                    formatBalance(dayBalance)
                  )}
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Total do mês:
          </span>
          <span
            className={`text-lg font-bold ${
              totalBalance > 0
                ? "text-green-600 dark:text-green-400"
                : totalBalance < 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {formatBalance(totalBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
