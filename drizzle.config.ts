import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load the same .env.local the app uses.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: fall back to variables already in the environment.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
