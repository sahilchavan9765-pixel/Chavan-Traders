import * as schema from "./schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// ─── Neon HTTP database (runtime — uses pooled connection) ────────────────────

const pooledUrl = process.env.DATABASE_URL_POOLED;

if (!pooledUrl) {
  throw new Error(
    "DATABASE_URL_POOLED is not set. Add it to .env.local — see .env.example"
  );
}

const sql = neon(pooledUrl);
export const db = drizzle(sql, { schema });

/**
 * No-op for Neon — migrations are applied via `npm run db:migrate` before deploy.
 * Kept for API compatibility with existing server actions.
 */
export async function waitForMigrations(): Promise<void> {
  // no-op
}

export { schema };
