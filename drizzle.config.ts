import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Detect dialect from DATABASE_URL
const dialect = connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://")
  ? "postgresql"
  : "mysql";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect,
  dbCredentials: {
    url: connectionString,
  },
});
