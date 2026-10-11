import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The HTTP driver sends each query as one fetch, which suits serverless functions: no
// connection pool to keep warm. db.batch() runs several statements in one transaction.
let instance: NeonHttpDatabase<typeof schema> | undefined;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  instance ??= drizzle({ client: neon(process.env.DATABASE_URL), schema });
  return instance;
}

export { schema };
