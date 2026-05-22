import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // Single round-trip via CTEs instead of 5 parallel queries — Singapore
  // pooler RTT is the same per call so 1 query >> 5 parallel.
  const rows = await db.execute<{
    section: string;
    payload: any;
  }>(sql`
    with
      counts as (
        select
          count(*) filter (where status <> 'completed')::int as scheduled,
          count(*) filter (where status <> 'completed' and next_due_date >= ${today.toISOString()}::timestamp and next_due_date <= ${in7.toISOString()}::timestamp)::int as due_soon,
          count(*) filter (where status <> 'completed' and next_due_date < ${today.toISOString()}::timestamp)::int as overdue
        from public.payment_schedules
      ),
      paid as (
        select
          coalesce(sum(amount), 0)::text as total,
          count(*)::int as c
        from public.payment_records
        where payment_date >= ${monthStart.toISOString()}::timestamp and payment_date < ${monthEnd.toISOString()}::timestamp
      ),
      upcoming as (
        select coalesce(jsonb_agg(row_to_json(s.*) order by s.next_due_date asc), '[]'::jsonb) as items
        from (
          select * from public.payment_schedules
          where status <> 'completed'
          order by next_due_date asc
          limit 10
        ) s
      )
    select 'counts'   as section, row_to_json(counts.*)::jsonb   as payload from counts
    union all
    select 'paid'     as section, row_to_json(paid.*)::jsonb     as payload from paid
    union all
    select 'upcoming' as section, upcoming.items                 as payload from upcoming
  `);

  const result = Object.fromEntries(rows.map((r: any) => [r.section, r.payload]));
  const counts = result.counts ?? {};
  const paid = result.paid ?? {};

  return NextResponse.json({
    scheduled: counts.scheduled ?? 0,
    dueSoon: counts.due_soon ?? 0,
    overdue: counts.overdue ?? 0,
    paidThisMonth: Number(paid.total ?? 0),
    paidThisMonthCount: paid.c ?? 0,
    upcoming: result.upcoming ?? [],
  });
}
