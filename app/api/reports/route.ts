import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentRecords, internalCompanies, expenseTypes } from "@shared/schema";

export async function GET() {
  await requireUser();
  const [records, companies, expenses] = await Promise.all([
    db.select().from(paymentRecords),
    db.select().from(internalCompanies),
    db.select().from(expenseTypes),
  ]);

  const cName = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const eName = Object.fromEntries(expenses.map((e) => [e.id, e.name]));

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
    const ek = eName[r.expenseId.split("-")[0]] || "(none)";
    byExpense[ek] = (byExpense[ek] ?? 0) + amt;
  }

  return NextResponse.json({
    byMonth: Object.keys(byMonth).sort().map((k) => ({ month: k, total: byMonth[k].total, count: byMonth[k].count })),
    byCompany: Object.entries(byCompany).map(([company, total]) => ({ company, total })),
    byExpense: Object.entries(byExpense).map(([expenseType, total]) => ({ expenseType, total })),
  });
}
