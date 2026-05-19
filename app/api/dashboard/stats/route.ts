import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentSchedules, paymentRecords } from "@shared/schema";

export async function GET() {
  await requireUser();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [todayIso, in7Iso, ms, me] = [today.toISOString(), in7.toISOString(), monthStart.toISOString(), monthEnd.toISOString()];

  const [scheduled, dueSoon, overdue, paid, upcoming] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(paymentSchedules).where(sql`status <> 'completed'`),
    db.select({ c: sql<number>`count(*)::int` }).from(paymentSchedules)
      .where(sql`status <> 'completed' and next_due_date >= ${todayIso}::timestamp and next_due_date <= ${in7Iso}::timestamp`),
    db.select({ c: sql<number>`count(*)::int` }).from(paymentSchedules)
      .where(sql`status <> 'completed' and next_due_date < ${todayIso}::timestamp`),
    db.select({
      total: sql<string>`coalesce(sum(amount),0)::text`,
      c: sql<number>`count(*)::int`,
    }).from(paymentRecords).where(sql`payment_date >= ${ms}::timestamp and payment_date < ${me}::timestamp`),
    db.select().from(paymentSchedules)
      .where(sql`status <> 'completed'`)
      .orderBy(sql`next_due_date asc`)
      .limit(10),
  ]);

  return NextResponse.json({
    scheduled: scheduled[0]?.c ?? 0,
    dueSoon: dueSoon[0]?.c ?? 0,
    overdue: overdue[0]?.c ?? 0,
    paidThisMonth: Number(paid[0]?.total ?? 0),
    paidThisMonthCount: paid[0]?.c ?? 0,
    upcoming,
  });
}
