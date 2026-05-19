import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { paymentRecordAudits } from "@shared/schema";

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
  await requireAdmin();
  const rows = await db
    .select()
    .from(paymentRecordAudits)
    .orderBy(desc(paymentRecordAudits.createdAt))
    .limit(500);
  return NextResponse.json(rows);
}
