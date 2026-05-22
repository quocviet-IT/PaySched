import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

// `postgres-js` with prepare:false because Supabase's transaction pooler
// (port 6543) does not support prepared statements. max=3 because each
// serverless instance handles 1 request at a time; a higher pool just
// burns Supabase pooler slots without speeding anything up.
const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
