import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./auth";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { workSettings as workSettingsTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { importFromExcel } from "./importService";
import { loginUser, registerUser } from "./auth";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await loginUser(input.email, input.password);
        if (!result) {
          throw new Error("Email ou senha inválidos");
        }

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        return result.user;
      }),

    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await registerUser(input.email, input.password, input.name);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        return result.user;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),

  timeEntries: router({
    getByMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
        const endDate = `${input.year}-${String(input.month).padStart(2, "0")}-31`;
        return db.getTimeEntriesByDateRange(ctx.user.id, startDate, endDate);
      }),

    getByDate: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const entry = await db.getOrCreateTimeEntry(ctx.user.id, input.date);
        return entry;
      }),

    update: protectedProcedure
      .input(
        z.object({
          date: z.string(),
          time1: z.string().nullable().optional(),
          time2: z.string().nullable().optional(),
          time3: z.string().nullable().optional(),
          time4: z.string().nullable().optional(),
          time5: z.string().nullable().optional(),
          time6: z.string().nullable().optional(),
          dayType: z.enum(["normal", "holiday", "leave", "justified_absence"]).optional(),
          notes: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.upsertTimeEntry({
          userId: ctx.user.id,
          date: input.date,
          time1: input.time1,
          time2: input.time2,
          time3: input.time3,
          time4: input.time4,
          time5: input.time5,
          time6: input.time6,
          dayType: input.dayType || "normal",
          notes: input.notes,
        });
      }),
  }),

  workSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateWorkSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          weekdayHours: z.number().min(1).max(24).optional(),
          saturdayHours: z.number().min(1).max(24).optional(),
          bankPeriod: z.enum(["monthly", "semesterly"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const settings = await db.getOrCreateWorkSettings(ctx.user.id);
        if (!settings) throw new Error("Failed to get settings");

        const updates: Record<string, unknown> = {};
        if (input.weekdayHours !== undefined) updates.weekdayHours = input.weekdayHours;
        if (input.saturdayHours !== undefined) updates.saturdayHours = input.saturdayHours;
        if (input.bankPeriod !== undefined) updates.bankPeriod = input.bankPeriod;

        await database
          .update(workSettingsTable)
          .set(updates)
          .where(eq(workSettingsTable.id, settings.id));

        return db.getOrCreateWorkSettings(ctx.user.id);
      }),
  }),

  summary: router({
    getMonthly: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getMonthlySummary(ctx.user.id, input.year, input.month);
      }),

    getAllMonthly: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllMonthlySummaries(ctx.user.id);
    }),
  }),

  import: router({
    uploadExcel: protectedProcedure
      .input(z.object({ fileData: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const buffer = Buffer.from(input.fileData, "base64");
          const result = await importFromExcel(ctx.user.id, buffer);
          return result;
        } catch (error) {
          throw new Error("Erro ao importar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;