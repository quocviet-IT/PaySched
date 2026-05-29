import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// The Supabase transaction pooler (port 6543) hangs multi-query routes
// (DELETE record, /api/reports) for both `next dev` and Vercel functions
// — `max:1` only papers over the parallel case, not the sequential one.
// Prefer the session pooler (port 5432) when available; fall back to the
// transaction pooler only if DATABASE_URL_DIRECT isn't set.
const isProd = process.env.NODE_ENV === "production";
const connectionString =
  process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const usingTxnPooler = /:6543\//.test(connectionString);

// Reuse the same `postgres` client across HMR reloads in dev so we don't
// leak file descriptors / exhaust the session pooler's 15-client cap.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    // Transaction pooler (port 6543) doesn't support prepared statements.
    prepare: !usingTxnPooler,
    // One connection per serverless instance. The session pooler caps total
    // clients at 15; with max:3 a handful of warm instances exhausted it and
    // routes threw "max clients reached in session mode" (XX000). max:1 lets
    // ~3x more instances run concurrently under the same cap. Queries here are
    // tiny so serializing an instance's queries onto one connection is cheap,
    // and session mode (unlike the txn pooler) handles it without hanging.
    max: 1,
    // Drop idle sockets so HMR + repeated requests don't pile up.
    idle_timeout: 20,
  });
if (!isProd) globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
