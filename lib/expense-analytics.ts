import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { PaymentRecord, PaymentSchedule } from "@shared/schema";

// Frequencies supported by -next (lib/recurrence.ts). No "weekly".
export type Frequency =
  | "one-time"
  | "bi-weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/**
 * Number of times a recurring expense occurs per month, used to normalise
 * schedules of different cadences onto a single "monthly run-rate" figure.
 * One-time expenses are not part of the recurring run-rate.
 */
export const MONTHLY_FACTOR: Record<string, number> = {
  "bi-weekly": 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  "one-time": 0,
};

export const FREQUENCY_LABELS: Record<string, string> = {
  "one-time": "One-time",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

const currencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFull.format(value);
}

export function formatCurrencyWhole(value: number): string {
  return currencyWhole.format(value);
}

/** Compact currency for chart axes: $1.2k, $3.4M. */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

export function isRecurring(frequency: string): boolean {
  return frequency !== "one-time" && frequency in MONTHLY_FACTOR;
}

/**
 * An expense schedule counts as an active obligation when it has not been
 * marked completed and has not been cancelled (`isActive === false`).
 */
export function isActive(
  schedule: Pick<PaymentSchedule, "status"> & { isActive?: boolean | null },
): boolean {
  return schedule.status !== "completed" && schedule.isActive !== false;
}

/** Advance a date by a single interval of the given frequency. */
export function advance(date: Date, frequency: string): Date | null {
  switch (frequency) {
    case "bi-weekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addQuarters(date, 1);
    case "yearly":
      return addYears(date, 1);
    default:
      return null; // one-time has no next occurrence
  }
}

/**
 * Monthly committed run-rate: every recurring schedule's amount normalised to
 * a per-month figure. One-time schedules are excluded.
 */
export function monthlyRunRate(schedules: PaymentSchedule[]): number {
  return schedules.filter(isActive).reduce((sum, s) => {
    const factor = MONTHLY_FACTOR[s.frequency] ?? 0;
    return sum + parseAmount(s.amount) * factor;
  }, 0);
}

/**
 * Project the dated occurrences of a schedule that fall within [from, to].
 * Recurring schedules roll forward from their next due date; one-time
 * schedules contribute a single occurrence if it lands in the window.
 */
export function projectOccurrences(
  schedule: PaymentSchedule,
  from: Date,
  to: Date,
): Date[] {
  const out: Date[] = [];
  let cursor = new Date(schedule.nextDueDate);
  if (Number.isNaN(cursor.getTime())) return out;

  if (!isRecurring(schedule.frequency)) {
    if (!isBefore(cursor, from) && !isAfter(cursor, to)) out.push(cursor);
    return out;
  }

  // Roll a past next-due-date forward to the start of the window.
  let guard = 0;
  while (isBefore(cursor, from) && guard < 1000) {
    const next = advance(cursor, schedule.frequency);
    if (!next) break;
    cursor = next;
    guard += 1;
  }

  guard = 0;
  while (!isAfter(cursor, to) && guard < 1000) {
    out.push(new Date(cursor));
    const next = advance(cursor, schedule.frequency);
    if (!next) break;
    cursor = next;
    guard += 1;
  }
  return out;
}

export interface ForecastBucket {
  monthStart: Date;
  label: string;
  total: number;
  count: number;
}

/**
 * Projected upcoming spend bucketed by calendar month, starting from the
 * current month, for `monthsAhead` months (inclusive of the current month).
 */
export function monthlyForecast(
  schedules: PaymentSchedule[],
  now: Date,
  monthsAhead = 6,
): ForecastBucket[] {
  const from = startOfDay(now);
  const firstMonth = startOfMonth(now);
  const buckets: ForecastBucket[] = Array.from({ length: monthsAhead }, (_, i) => {
    const monthStart = addMonths(firstMonth, i);
    return {
      monthStart,
      label: monthShort(monthStart),
      total: 0,
      count: 0,
    };
  });
  const windowEnd = addMonths(firstMonth, monthsAhead); // exclusive upper edge

  schedules.filter(isActive).forEach((schedule) => {
    const amount = parseAmount(schedule.amount);
    const occurrences = projectOccurrences(schedule, from, windowEnd);
    occurrences.forEach((date) => {
      const bucket = buckets.find((b) => isSameMonth(b.monthStart, date));
      if (bucket) {
        bucket.total += amount;
        bucket.count += 1;
      }
    });
  });

  return buckets;
}

export interface BreakdownSlice {
  key: string;
  label: string;
  value: number;
  count: number;
}

/**
 * Sum active scheduled amounts grouped by an arbitrary dimension key, returning
 * slices sorted from largest to smallest.
 */
export function breakdownBy(
  schedules: PaymentSchedule[],
  keyOf: (s: PaymentSchedule) => string,
  labelOf: (key: string) => string,
): BreakdownSlice[] {
  const groups = new Map<string, BreakdownSlice>();
  schedules.filter(isActive).forEach((schedule) => {
    const key = keyOf(schedule) || "unknown";
    const existing =
      groups.get(key) ?? { key, label: labelOf(key), value: 0, count: 0 };
    existing.value += parseAmount(schedule.amount);
    existing.count += 1;
    groups.set(key, existing);
  });
  return Array.from(groups.values()).sort((a, b) => b.value - a.value);
}

export interface TrendPoint {
  monthStart: Date;
  label: string;
  total: number;
  count: number;
}

/**
 * Actual amounts paid, bucketed by calendar month, for the last `months`
 * months up to and including the current month.
 */
export function monthlySpendTrend(
  records: PaymentRecord[],
  now: Date,
  months = 6,
): TrendPoint[] {
  const firstMonth = startOfMonth(subMonths(now, months - 1));
  const points: TrendPoint[] = Array.from({ length: months }, (_, i) => {
    const monthStart = addMonths(firstMonth, i);
    return { monthStart, label: monthShort(monthStart), total: 0, count: 0 };
  });

  records.forEach((rec) => {
    const date = new Date(rec.paymentDate);
    if (Number.isNaN(date.getTime())) return;
    const point = points.find((p) => isSameMonth(p.monthStart, date));
    if (point) {
      point.total += parseAmount(rec.amount);
      point.count += 1;
    }
  });

  return points;
}

function monthShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ---- Timeframe ----

export type Timeframe = "week" | "month" | "quarter" | "year";

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  week: "Next 7 Days",
  month: "Next 30 Days",
  quarter: "Next 90 Days",
  year: "Next 12 Months",
};

/** The end of the rolling window for a timeframe, measured from `start`. */
export function getTimeframeEnd(timeframe: Timeframe, start: Date): Date {
  switch (timeframe) {
    case "week":
      return addDays(start, 7);
    case "month":
      return addMonths(start, 1);
    case "quarter":
      return addQuarters(start, 1);
    case "year":
      return addYears(start, 1);
    default:
      return addMonths(start, 1);
  }
}

// ---- Payment issues ----

export type IssueType = "overdue" | "underpaid" | "overpaid" | "late";

export interface PaymentIssue {
  scheduleId: string;
  type: IssueType;
  vendorName: string;
  expenseId: string;
  companyName?: string;
  amount: number;
  detail: string;
}

/**
 * Surface active obligations that need attention: overdue (past due), under- or
 * overpaid against the latest recorded payment, and payments recorded late.
 * Not timeframe-scoped — an issue is an issue regardless of the selected window.
 * Sorted by priority: overdue → late → underpaid → overpaid.
 */
export function computePaymentIssues(
  schedules: PaymentSchedule[],
  records: PaymentRecord[],
  now: Date,
  companyName: (id: string) => string | undefined,
): PaymentIssue[] {
  const tolerance = 0.01;
  const recordsByExpenseId = new Map<string, PaymentRecord[]>();
  records.forEach((record) => {
    const bucket = recordsByExpenseId.get(record.expenseId) ?? [];
    bucket.push(record);
    recordsByExpenseId.set(record.expenseId, bucket);
  });

  const list: PaymentIssue[] = [];
  schedules.forEach((s) => {
    if (s.status === "completed" || s.isActive === false) return;
    const dueDate = new Date(s.nextDueDate);
    const scheduleAmount = parseAmount(s.amount);
    const company = companyName(s.internalCompanyId);
    const scheduleRecords = recordsByExpenseId.get(s.expenseId) ?? [];
    const latest = scheduleRecords
      .slice()
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];

    if (dueDate < now) {
      list.push({
        scheduleId: s.id,
        type: "overdue",
        vendorName: s.vendorName,
        expenseId: s.expenseId,
        companyName: company,
        amount: scheduleAmount,
        detail: `Due ${format(dueDate, "MMM dd, yyyy")}`,
      });
    }

    if (latest) {
      const paidAmount = parseAmount(latest.amount);
      const paidOn = format(new Date(latest.paymentDate), "MMM dd, yyyy");
      if (paidAmount + tolerance < scheduleAmount) {
        list.push({
          scheduleId: s.id,
          type: "underpaid",
          vendorName: s.vendorName,
          expenseId: s.expenseId,
          companyName: company,
          amount: scheduleAmount,
          detail: `Paid ${formatCurrency(paidAmount)} of ${formatCurrency(scheduleAmount)} on ${paidOn}`,
        });
      }
      if (paidAmount > scheduleAmount + tolerance) {
        list.push({
          scheduleId: s.id,
          type: "overpaid",
          vendorName: s.vendorName,
          expenseId: s.expenseId,
          companyName: company,
          amount: scheduleAmount,
          detail: `Paid ${formatCurrency(paidAmount)} over ${formatCurrency(scheduleAmount)} on ${paidOn}`,
        });
      }
    }
  });

  records.forEach((record) => {
    const daysLate = Number(record.daysLate ?? 0);
    if (daysLate <= 0) return;
    const s =
      schedules.find((x) => x.id === record.paymentScheduleId) ??
      schedules.find((x) => x.expenseId === record.expenseId);
    if (!s || s.isActive === false) return;
    const dueDate = record.scheduledDueDate ? new Date(record.scheduledDueDate) : undefined;
    list.push({
      scheduleId: s.id,
      type: "late",
      vendorName: s.vendorName,
      expenseId: s.expenseId,
      companyName: companyName(s.internalCompanyId),
      amount: parseAmount(s.amount),
      detail: `Paid ${format(new Date(record.paymentDate), "MMM dd, yyyy")} (${daysLate} day${daysLate === 1 ? "" : "s"} late${
        dueDate ? `; due ${format(dueDate, "MMM dd, yyyy")}` : ""
      })`,
    });
  });

  const priority = { overdue: 0, late: 1, underpaid: 2, overpaid: 3 } as const;
  return list.sort((a, b) => priority[a.type] - priority[b.type]);
}
