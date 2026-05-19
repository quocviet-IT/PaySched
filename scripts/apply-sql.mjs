#!/usr/bin/env node
/**
 * Applies the four SQL files to the Supabase Postgres database in order:
 *   1. supabase/migrations/0001_initial.sql  (schema + trigger)
 *   2. supabase/policies/rls.sql             (RLS for public tables)
 *   3. supabase/policies/storage.sql         (uploads bucket + storage policies)
 *   4. supabase/seed.sql                     (lookup defaults)
 *
 * Reads DATABASE_URL_DIRECT (or DATABASE_URL) from .env.local.
 * Each file is executed as one batch — Postgres parses semicolon-separated
 * statements. If a statement fails, the error is printed and the script exits
 * with a non-zero code.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

loadEnv({ path: resolve(root, ".env.local") });

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_DIRECT (or DATABASE_URL) is not set. Did you fill .env.local?");
  process.exit(1);
}

const files = [
  "supabase/migrations/0001_initial.sql",
  "supabase/policies/rls.sql",
  "supabase/policies/storage.sql",
  "supabase/seed.sql",
];

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

let hadError = false;
for (const rel of files) {
  const abs = resolve(root, rel);
  const body = await readFile(abs, "utf8");
  process.stdout.write(`→ ${rel} ... `);
  try {
    await sql.unsafe(body);
    process.stdout.write("ok\n");
  } catch (err) {
    process.stdout.write("FAILED\n");
    console.error("   ", err.message);
    if (err.position) console.error("    near position", err.position);
    hadError = true;
  }
}

await sql.end({ timeout: 5 });
process.exit(hadError ? 1 : 0);
