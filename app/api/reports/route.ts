import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentRecords, paymentSchedules, internalCompanies, expenseTypes } from "@shared/schema";

export async function GET() {
  await requireUser();
  const [records, schedules, companies, expenses] = await Promise.all([
    db.select().from(paymentRecords),
    db.select().from(paymentSchedules),
    db.select().from(internalCompanies),
    db.select().from(expenseTypes),
  ]);

  const cName = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const eName = Object.fromEntries(expenses.map((e) => [e.id, e.name]));
  // Two ways to find a record's expense type: by schedule id (preferred,
  // present when paid via a schedule), and by expense_id (fallback for
  // ad-hoc records or records whose schedule was later deleted).
  const scheduleExpenseTypeById = Object.fromEntries(schedules.map((s) => [s.id, s.expenseTypeId]));
  const scheduleExpenseTypeByExpenseId = Object.fromEntries(schedules.map((s) => [s.expenseId, s.expenseTypeId]));

  const byMonth: Record<string, { total: number; count: number }> = {};
  const byCompany: Record<string, number> = {};
  const byExpense: Record<string, number> = {};

  for (const r of records) {
    const amt = Number(r.amount) || 0;
    if (r.paymentDate) {
      const d = new Date(r.paymentDate);
      if (!Number.isNaN(d.getTime())) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[k] ??= { total: 0, count: 0 };
        byMonth[k].total += amt; byMonth[k].count++;
      }
    }
    const ck = cName[r.internalCompanyId] || "(none)";
    byCompany[ck] = (byCompany[ck] ?? 0) + amt;
    const expenseTypeId =
      (r.paymentScheduleId && scheduleExpenseTypeById[r.paymentScheduleId]) ||
      scheduleExpenseTypeByExpenseId[r.expenseId];
    const ek = (expenseTypeId && eName[expenseTypeId]) || "(none)";
    byExpense[ek] = (byExpense[ek] ?? 0) + amt;
  }

  return NextResponse.json({
    byMonth: Object.keys(byMonth).sort().map((k) => ({ month: k, total: byMonth[k].total, count: byMonth[k].count })),
    byCompany: Object.entries(byCompany).map(([company, total]) => ({ company, total })),
    byExpense: Object.entries(byExpense).map(([expenseType, total]) => ({ expenseType, total })),
  });
}
