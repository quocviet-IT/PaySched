import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/crud";
import { paymentRecords, paymentRecordAudits, paymentSchedules, type PaymentSchedule } from "@shared/schema";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function addFrequencyInterval(from: Date, frequency: string): Date | null {
  const d = new Date(from);
  switch (frequency) {
    case "bi-weekly": d.setDate(d.getDate() + 14); return d;
    case "monthly":   d.setMonth(d.getMonth() + 1); return d;
    case "quarterly": d.setMonth(d.getMonth() + 3); return d;
    case "yearly":    d.setFullYear(d.getFullYear() + 1); return d;
    default: return null;
  }
}

function deriveScheduleUpdate(schedule: PaymentSchedule, paymentDate: Date):
  | { status: "completed" }
  | { nextDueDate: Date; status: "scheduled" }
  | null
{
  if (!schedule.frequency) return null;
  if (schedule.frequency === "one-time") return { status: "completed" };
  const currentDue = new Date(schedule.nextDueDate);
  if (Number.isNaN(currentDue.getTime())) return null;
  let nextDue = new Date(currentDue.getTime());
  let i = 0;
  while (nextDue <= paymentDate) {
    const c = addFrequencyInterval(nextDue, schedule.frequency);
    if (!c) return { status: "completed" };
    nextDue = c;
    if (++i > 24) break;
  }
  return { nextDueDate: nextDue, status: "scheduled" };
}

const itemSchema = z.object({
  paymentScheduleId: z.string().nullable().optional(),
  internalCompanyId: z.string().optional(),
  expenseId: z.string().optional(),
  paymentDate: z.coerce.date(),
  amount: z.union([z.string(), z.number()]),
  paymentMethod: z.string().default("other"),
  paymentAccountId: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  confirmationFile: z.string().nullable().optional(),
  approvalScreenshot: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const raw = await req.json().catch(() => null);
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ message: "Request body must be a non-empty array" }, { status: 400 });
  }

  const parsed = z.array(itemSchema).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid items", errors: parsed.error.flatten() }, { status: 400 });
  }

  // Pre-fetch all referenced schedules in one query instead of N queries inside the loop.
  const scheduleIds = Array.from(
    new Set(
      parsed.data
        .map((it) => it.paymentScheduleId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const scheduleMap = new Map<string, PaymentSchedule>();
  if (scheduleIds.length > 0) {
    const rows = await db
      .select()
      .from(paymentSchedules)
      .where(inArray(paymentSchedules.id, scheduleIds));
    for (const s of rows) scheduleMap.set(s.id, s);
  }

  const created = [] as any[];
  for (const item of parsed.data) {
    const scheduleId = item.paymentScheduleId ?? null;
    const schedule: PaymentSchedule | null = scheduleId ? scheduleMap.get(scheduleId) ?? null : null;
    const internalCompanyId = item.internalCompanyId ?? schedule?.internalCompanyId;
    const expenseId = schedule?.expenseId ?? item.expenseId;
    if (!internalCompanyId || !expenseId) {
      return NextResponse.json({ message: "Internal company and expense ID are required" }, { status: 400 });
    }

    const paymentDate = new Date(item.paymentDate);
    const rawDue = schedule ? new Date(schedule.nextDueDate) : null;
    const daysLate = rawDue
      ? Math.max(0, Math.ceil((paymentDate.getTime() - rawDue.getTime()) / MS_PER_DAY))
      : 0;

    const [row] = await db.insert(paymentRecords).values({
      paymentScheduleId: scheduleId,
      expenseId,
      internalCompanyId,
      paymentDate,
      amount: String(item.amount),
      paidBy: session.id,
      approvedBy: item.approvedBy ?? null,
      paymentMethod: item.paymentMethod,
      paymentAccountId: item.paymentAccountId ?? null,
      confirmationFile: item.confirmationFile ?? null,
      approvalScreenshot: item.approvalScreenshot ?? null,
      scheduledDueDate: rawDue,
      daysLate,
    }).returning();
    created.push(row);

    await db.insert(paymentRecordAudits).values({
      paymentRecordId: row.id,
      action: "create",
      reason: "Bulk CSV import",
      beforeSnapshot: {},
      afterSnapshot: row,
      performedBy: session.id,
    });

    if (schedule) {
      const update = deriveScheduleUpdate(schedule, paymentDate);
      if (update) await db.update(paymentSchedules).set(update as any).where(eq(paymentSchedules.id, schedule.id));
    }
  }

  await logAudit(
    session.id,
    session.username,
    "bulk_create",
    "payment_records",
    null,
    `Imported ${created.length} record(s) via CSV`,
  );
  return NextResponse.json(created, { status: 201 });
}
