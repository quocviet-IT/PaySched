import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const rows = await db.execute(sql`
    select id, user_id as "userId", username, action, entity_type as "entityType",
           entity_id as "entityId", details, created_at as "createdAt"
    from public.audit_log
    order by created_at desc
    limit 200
  `);
  return NextResponse.json(rows);
}
