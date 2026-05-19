import { NextRequest, NextResponse } from "next/server";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/crud";
import { paymentSchedules, internalCompanies, insertPaymentScheduleSchema } from "@shared/schema";

export async function GET() {
  await requireUser();
  return NextResponse.json(await db.select().from(paymentSchedules));
}

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const parsed = insertPaymentScheduleSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const [company] = await db.select().from(internalCompanies)
    .where(eq(internalCompanies.id, data.internalCompanyId)).limit(1);
  if (!company) {
    return NextResponse.json({ message: "Internal company not found" }, { status: 400 });
  }

  const prefix = `${company.abbreviation}-${data.vendorAbbreviation}-`;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentSchedules)
    .where(like(paymentSchedules.expenseId, `${prefix}%`));
  const seq = (count ?? 0) + 1;
  const expenseId = `${prefix}${String(seq).padStart(3, "0")}`;

  const [row] = await db.insert(paymentSchedules).values({
    expenseId,
    internalCompanyId: data.internalCompanyId,
    vendorName: data.vendorName,
    vendorAbbreviation: data.vendorAbbreviation,
    amount: String(data.amount),
    frequency: data.frequency,
    nextDueDate: data.nextDueDate,
    paymentTypeId: data.paymentTypeId,
    paymentAccountId: data.paymentAccountId,
    expenseTypeId: data.expenseTypeId,
    status: data.status ?? "scheduled",
  }).returning();

  await logAudit(session.id, session.username, "create", "payment_schedules", row.id, `${row.expenseId} · ${row.vendorName}`);
  return NextResponse.json(row, { status: 201 });
}
