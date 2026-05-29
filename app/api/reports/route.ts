import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentRecords, paymentSchedules, internalCompanies, expenseTypes } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentSchedule, PaymentRecord, InternalCompany } from "@shared/schema";

type IssueType = "overdue" | "late" | "underpaid" | "overpaid";
interface Issue {
  type: IssueType;
  vendorName: string;
  companyName: string | null;
  detail: string;
}

const TOLERANCE = 0.01;
const PRIORITY: Record<IssueType, number> = { overdue: 0, late: 1, underpaid: 2, overpaid: 3 };

// Computed server-side so the Reports page needs a single authenticated
// request instead of fanning out to /payment-records, /payment-schedules
// and /internal-companies and recomputing this in the browser.
function computeIssues(
  schedules: PaymentSchedule[],
  records: PaymentRecord[],
  companies: InternalCompany[],
): Issue[] {
  const now = new Date();
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const schedulesById = new Map(schedules.map((s) => [s.id, s]));
  const schedulesByExpense = new Map(schedules.map((s) => [s.expenseId, s]));

  const latestByExpense = new Map<string, PaymentRecord>();
  for (const r of records) {
    const prev = latestByExpense.get(r.expenseId);
    if (!prev || new Date(r.paymentDate) > new Date(prev.paymentDate)) {
      latestByExpense.set(r.expenseId, r);
    }
  }

  const issues: Issue[] = [];

  for (const s of schedules) {
    if (s.status === "completed") continue;
    const company = companyMap.get(s.internalCompanyId);
    const dueDate = new Date(s.nextDueDate);
    const scheduleAmount = Number.parseFloat(s.amount);
    const latest = latestByExpense.get(s.expenseId);

    if (dueDate < now) {
      issues.push({ type: "overdue", vendorName: s.vendorName, companyName: company?.name ?? null, detail: `Due ${formatDate(dueDate)}` });
    }

    if (latest) {
      const paid = Number.parseFloat(latest.amount);
      const date = formatDate(latest.paymentDate);
      if (paid + TOLERANCE < scheduleAmount) {
        issues.push({
          type: "underpaid", vendorName: s.vendorName, companyName: company?.name ?? null,
          detail: `Paid ${formatCurrency(paid)} of ${formatCurrency(scheduleAmount)} on ${date}`,
        });
      } else if (paid > scheduleAmount + TOLERANCE) {
        issues.push({
          type: "overpaid", vendorName: s.vendorName, companyName: company?.name ?? null,
          detail: `Paid ${formatCurrency(paid)} over ${formatCurrency(scheduleAmount)} on ${date}`,
        });
      }
    }
  }

  for (const r of records) {
    if (!r.daysLate || r.daysLate <= 0) continue;
    const schedule = r.paymentScheduleId
      ? schedulesById.get(r.paymentScheduleId)
      : schedulesByExpense.get(r.expenseId);
    if (!schedule) continue;
    const company = companyMap.get(schedule.internalCompanyId) ?? companyMap.get(r.internalCompanyId);
    const dueDate = r.scheduledDueDate ? new Date(r.scheduledDueDate) : null;
    issues.push({
      type: "late", vendorName: schedule.vendorName, companyName: company?.name ?? null,
      detail: `Paid on ${formatDate(r.paymentDate)} (${r.daysLate} day${r.daysLate === 1 ? "" : "s"} late${
        dueDate ? `; due ${formatDate(dueDate)}` : ""
      })`,
    });
  }

  return issues.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
}

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
    issues: computeIssues(schedules, records, companies),
  });
}
