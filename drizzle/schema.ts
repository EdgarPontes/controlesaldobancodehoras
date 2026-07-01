import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Time entries for daily time tracking.
 * Stores up to 6 time entries per day (entry, lunch start, lunch end, exit, and 2 extras).
 */
export const timeEntries = mysqlTable("timeEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  time1: varchar("time1", { length: 8 }), // HH:MM:SS
  time2: varchar("time2", { length: 8 }),
  time3: varchar("time3", { length: 8 }),
  time4: varchar("time4", { length: 8 }),
  time5: varchar("time5", { length: 8 }),
  time6: varchar("time6", { length: 8 }),
  dayType: mysqlEnum("dayType", ["normal", "holiday", "leave", "justified_absence"]).default("normal"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Work settings per user.
 * Stores configurable work hours (default: 8h weekdays, 4h Saturday).
 */
export const workSettings = mysqlTable("workSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  weekdayHours: int("weekdayHours").default(8).notNull(), // in hours
  saturdayHours: int("saturdayHours").default(4).notNull(), // in hours
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkSettings = typeof workSettings.$inferSelect;
export type InsertWorkSettings = typeof workSettings.$inferInsert;

/**
 * Monthly summary cache for performance.
 * Stores pre-calculated monthly totals.
 */
export const monthlySummary = mysqlTable("monthlySummary", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  totalMinutes: int("totalMinutes").notNull(), // Total balance in minutes (can be negative)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlySummary = typeof monthlySummary.$inferSelect;
export type InsertMonthlySummary = typeof monthlySummary.$inferInsert;