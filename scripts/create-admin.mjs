#!/usr/bin/env node
/**
 * Creates an admin user via Supabase Auth admin API, then promotes the
 * auto-created `profiles` row to role='Admin'.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> [username]
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "..", ".env.local") });

const [email, password, usernameArg] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [username]");
  process.exit(1);
}
const username = usernameArg ?? email.split("@")[0];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url || !serviceKey || !dbUrl) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL_DIRECT");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

console.log(`Creating auth user ${email} ...`);
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { username },
});
if (error) {
  console.error("Auth create failed:", error.message);
  process.exit(1);
}
const userId = data.user.id;
console.log("  auth.users.id =", userId);

// Trigger should have inserted into profiles already. Upsert + promote to Admin.
const sql = postgres(dbUrl, { prepare: false, max: 1 });
const rows = await sql`
  insert into public.profiles (id, username, role)
  values (${userId}, ${username}, 'Admin')
  on conflict (id) do update set role = 'Admin', username = excluded.username
  returning id, username, role, created_at
`;
console.log("Profile:", rows[0]);
await sql.end();
console.log("\nLogin at http://localhost:3000/login");
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
