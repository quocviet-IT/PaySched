import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// In dev (`next dev`) the long-lived process + Supabase transaction pooler
// combination hangs on multi-query routes (DELETE record, /api/reports).
// Prefer the session pooler / direct URL locally; production stays on the
// transaction pooler because each Vercel function handles one request.
const isProd = process.env.NODE_ENV === "production";
const connectionString =
  (!isProd && process.env.DATABASE_URL_DIRECT) || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const usingTxnPooler = connectionString === process.env.DATABASE_URL;

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
    // Keep client-side max well below the pooler's hard limit.
    max: usingTxnPooler ? 1 : 3,
    // Drop idle sockets so HMR + repeated requests don't pile up.
    idle_timeout: 20,
  });
if (!isProd) globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
