import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  paymentRecords,
  paymentSchedules,
  insertPaymentRecordSchema,
  type PaymentSchedule,
} from "@shared/schema";

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

function computeDaysLate(due: Date | null, paid: Date): number {
  if (!due) return 0;
  const diff = paid.getTime() - due.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / MS_PER_DAY);
}

export async function GET() {
  await requireUser();
  const rows = await db.select().from(paymentRecords).orderBy(desc(paymentRecords.paymentDate));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const raw = await req.json().catch(() => ({}));

  const scheduleId: string | null = raw.paymentScheduleId ?? null;
  let schedule: PaymentSchedule | null = null;
  if (scheduleId) {
    const [s] = await db.select().from(paymentSchedules).where(eq(paymentSchedules.id, scheduleId)).limit(1);
    schedule = s ?? null;
  }

  const internalCompanyId = raw.internalCompanyId ?? schedule?.internalCompanyId;
  const expenseId = schedule?.expenseId ?? raw.expenseId;
  if (!internalCompanyId) return NextResponse.json({ message: "Internal company is required" }, { status: 400 });
  if (!expenseId) return NextResponse.json({ message: "Expense ID is required" }, { status: 400 });

  const parsed = insertPaymentRecordSchema.safeParse({
    paymentScheduleId: scheduleId,
    expenseId,
    internalCompanyId,
    paymentDate: raw.paymentDate,
    amount: raw.amount,
    approvedBy: raw.approvedBy || null,
    paymentMethod: raw.paymentMethod,
    paymentAccountId: raw.paymentAccountId || null,
    confirmationFile: raw.confirmationFile ?? null,
    approvalScreenshot: raw.approvalScreenshot ?? null,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const paymentDateInstance = new Date(data.paymentDate);
  const rawDueDate = schedule ? new Date(schedule.nextDueDate) : null;
  const daysLate = computeDaysLate(rawDueDate, paymentDateInstance);

  const [row] = await db.insert(paymentRecords).values({
    paymentScheduleId: data.paymentScheduleId ?? null,
    expenseId: data.expenseId,
    internalCompanyId: data.internalCompanyId,
    paymentDate: paymentDateInstance,
    amount: String(data.amount),
    paidBy: session.id,
    approvedBy: data.approvedBy ?? null,
    paymentMethod: data.paymentMethod,
    paymentAccountId: data.paymentAccountId ?? null,
    confirmationFile: data.confirmationFile ?? null,
    approvalScreenshot: data.approvalScreenshot ?? null,
    scheduledDueDate: rawDueDate,
    daysLate,
  }).returning();

  if (schedule) {
    const update = deriveScheduleUpdate(schedule, paymentDateInstance);
    if (update) {
      await db.update(paymentSchedules).set(update as any).where(eq(paymentSchedules.id, schedule.id));
    }
  }

  return NextResponse.json(row, { status: 201 });
}
