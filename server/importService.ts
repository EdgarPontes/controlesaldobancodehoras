/**
 * Service for importing time entries from Excel files
 */

import * as XLSX from "xlsx";
import { timeToMinutes } from "./timeCalculations";
import * as db from "./db";
import type { InsertTimeEntry } from "../drizzle/schema";

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
}

/**
 * Parse time value from Excel cell
 * Excel stores times as decimal numbers (0.5 = 12:00, 0.25 = 06:00, etc)
 */
function parseExcelTime(value: unknown): string | null {
  if (!value) return null;

  // If it's already a string in HH:MM:SS format
  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2}):(\d{2}):?(\d{2})?$/);
    if (match) {
      const hours = String(match[1]).padStart(2, "0");
      const minutes = String(match[2]).padStart(2, "0");
      const seconds = match[3] ? String(match[3]).padStart(2, "0") : "00";
      return `${hours}:${minutes}:${seconds}`;
    }
  }

  // If it's a number (Excel time format)
  if (typeof value === "number") {
    const hours = Math.floor(value * 24);
    const minutes = Math.floor((value * 24 - hours) * 60);
    const seconds = Math.round(((value * 24 - hours) * 60 - minutes) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Parse date from Excel cell
 */
function parseExcelDate(value: unknown): string | null {
  if (!value) return null;

  // If it's already a string in YYYY-MM-DD format
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return value;
    }
  }

  // If it's a number (Excel date serial)
  if (typeof value === "number") {
    // Excel epoch is 1900-01-01, but there's an off-by-one error for dates after Feb 28, 1900
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 1) * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Import time entries from Excel file buffer
 */
export async function importFromExcel(
  userId: number,
  fileBuffer: Buffer
): Promise<ImportResult> {
  const errors: string[] = [];
  let importedRows = 0;

  try {
    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    // Process each sheet (each sheet represents a month)
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (rows.length < 2) continue; // Skip empty sheets

      // Process each row (skip header)
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || row.length === 0) continue;

        try {
          // Extract date from first column (day number)
          const dayNumber = row[0];
          if (!dayNumber || typeof dayNumber !== "number") continue;

          // Extract month and year from sheet name (format: MMYYYY or similar)
          const monthMatch = sheetName.match(/(\d{2})(\d{4})/);
          if (!monthMatch) continue;

          const month = parseInt(monthMatch[1], 10);
          const year = parseInt(monthMatch[2], 10);

          if (month < 1 || month > 12 || year < 2000 || year > 2100) continue;

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

          // Extract times from columns
          const time1 = parseExcelTime(row[1]);
          const time2 = parseExcelTime(row[2]);
          const time3 = parseExcelTime(row[3]);
          const time4 = parseExcelTime(row[4]);
          const time5 = parseExcelTime(row[5]);
          const time6 = parseExcelTime(row[6]);

          // Skip if no times recorded
          if (!time1 && !time2 && !time3 && !time4 && !time5 && !time6) continue;

          // Create or update time entry
          const entry: InsertTimeEntry = {
            userId,
            date: dateStr,
            time1: time1 || null,
            time2: time2 || null,
            time3: time3 || null,
            time4: time4 || null,
            time5: time5 || null,
            time6: time6 || null,
            dayType: "normal" as const,
          };

          await db.upsertTimeEntry({
            userId,
            date: dateStr,
            time1: entry.time1,
            time2: entry.time2,
            time3: entry.time3,
            time4: entry.time4,
            time5: entry.time5,
            time6: entry.time6,
            dayType: entry.dayType,
          });
          importedRows++;
        } catch (error) {
          errors.push(`Erro na linha ${rowIndex + 1} da aba ${sheetName}: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
      }
    }

    return {
      success: true,
      totalRows: importedRows,
      importedRows,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: [error instanceof Error ? error.message : "Erro ao processar arquivo"],
    };
  }
}
