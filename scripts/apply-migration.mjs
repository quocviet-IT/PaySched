import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(file), "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  console.log(`Applying ${file}...`);
  await client.query(sql);
  console.log("OK");
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
