import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, timeEntries, workSettings, monthlySummary, InsertTimeEntry } from "../drizzle/schema";

let _db: any = null;

// Detect database type from DATABASE_URL
function getDatabaseType(url: string): "postgres" | "mysql" {
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return "postgres";
  }
  return "mysql";
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbType = getDatabaseType(process.env.DATABASE_URL);
      
      if (dbType === "postgres") {
        // PostgreSQL connection
        const client = postgres(process.env.DATABASE_URL);
        _db = drizzlePostgres(client);
      } else {
        // MySQL connection
        _db = drizzleMysql(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── User queries ──────────────────────────────────────────────────────────

export async function createUser(user: { email: string; name: string | null; passwordHash: string; role: string }): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role as "user" | "admin",
  });

  // Get the newly created user
  const created = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  return created[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: any = {
      email: user.email,
    };

    if (user.name !== undefined) values.name = user.name;
    if (user.passwordHash !== undefined) values.passwordHash = user.passwordHash;
    if (user.role !== undefined) values.role = user.role;
    if (user.lastSignedIn !== undefined) values.lastSignedIn = user.lastSignedIn;

    const dbType = getDatabaseType(process.env.DATABASE_URL || "");
    
    if (dbType === "postgres") {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.email,
        set: values,
      });
    } else {
      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: values,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// ── Time entries queries ───────────────────────────────────────────────────

export async function getTimeEntriesByMonth(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));
}

export async function upsertTimeEntry(entry: InsertTimeEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dbType = getDatabaseType(process.env.DATABASE_URL || "");
  
  if (dbType === "postgres") {
    await db.insert(timeEntries).values(entry).onConflictDoUpdate({
      target: [timeEntries.userId, timeEntries.date],
      set: entry,
    });
  } else {
    await db.insert(timeEntries).values(entry).onDuplicateKeyUpdate({
      set: entry,
    });
  }

  // Update monthly summary after time entry is upserted
  const dateStr = entry.date;
  const [year, month] = dateStr.split("-").slice(0, 2).map(Number);
  
  // Get all entries for the month to recalculate
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
  const monthEntries = await getTimeEntriesByDateRange(entry.userId, startDate, endDate);
  
  const userSettings = await getWorkSettings(entry.userId);
  if (!userSettings) return;

  // Import calculation functions
  const { calculateMonthlyBalance } = require("./balanceCalculator");
  
  const monthlyBalance = calculateMonthlyBalance(year, month, monthEntries, userSettings);
  
  // Upsert the monthly summary
  await upsertMonthlySummary({
    userId: entry.userId,
    year,
    month,
    totalMinutes: monthlyBalance.totalBalanceMinutes,
  });
}

export async function getWorkSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(workSettings)
    .where(eq(workSettings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function upsertWorkSettings(settings: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dbType = getDatabaseType(process.env.DATABASE_URL || "");
  
  if (dbType === "postgres") {
    return await db.insert(workSettings).values(settings).onConflictDoUpdate({
      target: workSettings.userId,
      set: settings,
    });
  } else {
    return await db.insert(workSettings).values(settings).onDuplicateKeyUpdate({
      set: settings,
    });
  }
}

export async function getMonthlySummaries(userId: number) {
  const db = await getDb();
  if (!db) return [];

  await refreshMonthlySummaries(userId);

  return await db
    .select()
    .from(monthlySummary)
    .where(eq(monthlySummary.userId, userId));
}

export async function upsertMonthlySummary(summary: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(monthlySummary)
    .where(
      and(
        eq(monthlySummary.userId, summary.userId),
        eq(monthlySummary.year, summary.year),
        eq(monthlySummary.month, summary.month)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(monthlySummary)
      .set({
        totalMinutes: summary.totalMinutes,
        updatedAt: new Date(),
      })
      .where(eq(monthlySummary.id, existing[0].id));
  }

  return await db.insert(monthlySummary).values({
    userId: summary.userId,
    year: summary.year,
    month: summary.month,
    totalMinutes: summary.totalMinutes,
  });
}

export async function getOrCreateWorkSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let settings = await getWorkSettings(userId);
  
  if (!settings) {
    const defaultSettings = {
      userId,
      weekdayHours: 8,
      saturdayHours: 4,
    };
    await upsertWorkSettings(defaultSettings);
    settings = await getWorkSettings(userId);
  }
  
  return settings;
}

export async function getMonthlySummary(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  await refreshMonthlySummaries(userId);

  const result = await db
    .select()
    .from(monthlySummary)
    .where(
      and(
        eq(monthlySummary.userId, userId),
        eq(monthlySummary.year, year),
        eq(monthlySummary.month, month)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAllMonthlySummaries(userId: number) {
  return getMonthlySummaries(userId);
}

// Aliases for backward compatibility
export const updateTimeEntry = upsertTimeEntry;

export async function getTimeEntriesByDateRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate)
      )
    );
}

export async function getOrCreateTimeEntry(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        eq(timeEntries.date, date)
      )
    )
    .limit(1);

  if (result.length > 0) {
    return result[0];
  }

  // Create new entry
  const newEntry = {
    userId,
    date,
    time1: null,
    time2: null,
    time3: null,
    time4: null,
    time5: null,
    time6: null,
    dayType: "normal" as const,
    notes: null,
  };

  await upsertTimeEntry(newEntry);
  return newEntry;
}

async function refreshMonthlySummaries(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const entries = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));

  const workSettings = await getWorkSettings(userId);
  if (!workSettings) return [];

  const entriesByMonth = new Map<string, InsertTimeEntry[]>();
  entries.forEach((entry: any) => {
    const [year, month] = entry.date.split("-").slice(0, 2);
    const key = `${year}-${month}`;
    const monthEntries = entriesByMonth.get(key) || [];
    monthEntries.push(entry);
    entriesByMonth.set(key, monthEntries);
  });

  const { calculateMonthlyBalance } = require("./balanceCalculator");

  const summaries: Array<{ userId: number; year: number; month: number; totalMinutes: number }> = [];
  for (const [key, monthEntries] of Array.from(entriesByMonth.entries())) {
    const [year, month] = key.split("-").map(Number);
    const monthlyBalance = calculateMonthlyBalance(year, month, monthEntries, workSettings);

    await upsertMonthlySummary({
      userId,
      year,
      month,
      totalMinutes: monthlyBalance.totalBalanceMinutes,
    });

    summaries.push({
      userId,
      year,
      month,
      totalMinutes: monthlyBalance.totalBalanceMinutes,
    });
  }

  return summaries;
}