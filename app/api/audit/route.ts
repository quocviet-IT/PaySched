import { NextRequest, NextResponse } from "next/server";
import { sql, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const userId = params.get("userId");

  const conditions: SQL[] = [];
  if (from && DATE_RE.test(from)) conditions.push(sql`created_at >= ${from}::date`);
  if (to && DATE_RE.test(to)) conditions.push(sql`created_at < (${to}::date + interval '1 day')`);
  if (userId && UUID_RE.test(userId)) conditions.push(sql`user_id = ${userId}::uuid`);

  const where = conditions.length
    ? sql`where ${sql.join(conditions, sql` and `)}`
    : sql``;

  const rows = await db.execute(sql`
    select id, user_id as "userId", username, action, entity_type as "entityType",
           entity_id as "entityId", details, created_at as "createdAt"
    from public.audit_log
    ${where}
    order by created_at desc
    limit 500
  `);
  return NextResponse.json(rows);
}
