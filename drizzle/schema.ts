import { pgTable, varchar, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Time entries for daily time tracking.
 * Stores up to 6 time entries per day.
 */
export const timeEntries = pgTable(
  "timeEntries",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
    time1: varchar("time1", { length: 8 }),
    time2: varchar("time2", { length: 8 }),
    time3: varchar("time3", { length: 8 }),
    time4: varchar("time4", { length: 8 }),
    time5: varchar("time5", { length: 8 }),
    time6: varchar("time6", { length: 8 }),
    dayType: varchar("dayType", { length: 30 }).default("normal"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    userDateUnique: uniqueIndex("timeEntries_userId_date_unique").on(table.userId, table.date),
  })
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Work settings per user.
 */
export const workSettings = pgTable("workSettings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  weekdayHours: integer("weekdayHours").default(8).notNull(),
  saturdayHours: integer("saturdayHours").default(4).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkSettings = typeof workSettings.$inferSelect;
export type InsertWorkSettings = typeof workSettings.$inferInsert;

/**
 * Monthly summary cache.
 */
export const monthlySummary = pgTable("monthlySummary", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  totalMinutes: integer("totalMinutes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MonthlySummary = typeof monthlySummary.$inferSelect;
export type InsertMonthlySummary = typeof monthlySummary.$inferInsert;