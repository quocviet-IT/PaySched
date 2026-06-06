import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, authErrorResponse } from "@/lib/auth";
import { paymentRecordAudits, profiles } from "@shared/schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const recordId = req.nextUrl.searchParams.get("recordId");
  if (recordId) {
    await requireUser();
    const rows = await db
      .select()
      .from(paymentRecordAudits)
      .where(eq(paymentRecordAudits.paymentRecordId, recordId))
      .orderBy(desc(paymentRecordAudits.createdAt));
    return NextResponse.json(rows);
  }

  try {
    await requireAdmin();
  } catch (e) {
    const res = authErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const userId = params.get("userId");

  const conditions: SQL[] = [];
  if (from && DATE_RE.test(from)) conditions.push(sql`${paymentRecordAudits.createdAt} >= ${from}::date`);
  if (to && DATE_RE.test(to)) conditions.push(sql`${paymentRecordAudits.createdAt} < (${to}::date + interval '1 day')`);
  if (userId && UUID_RE.test(userId)) conditions.push(eq(paymentRecordAudits.performedBy, userId));

  const rows = await db
    .select({
      id: paymentRecordAudits.id,
      paymentRecordId: paymentRecordAudits.paymentRecordId,
      action: paymentRecordAudits.action,
      reason: paymentRecordAudits.reason,
      beforeSnapshot: paymentRecordAudits.beforeSnapshot,
      afterSnapshot: paymentRecordAudits.afterSnapshot,
      performedBy: paymentRecordAudits.performedBy,
      performedByName: profiles.username,
      createdAt: paymentRecordAudits.createdAt,
    })
    .from(paymentRecordAudits)
    .leftJoin(profiles, eq(profiles.id, paymentRecordAudits.performedBy))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(paymentRecordAudits.createdAt))
    .limit(500);
  return NextResponse.json(rows);
}
