import { describe, it, expect } from "vitest";
import type { PaymentRecord, PaymentSchedule } from "@shared/schema";
import {
  parseAmount,
  MONTHLY_FACTOR,
  isActive,
  advance,
  monthlyRunRate,
  projectOccurrences,
  monthlyForecast,
  breakdownBy,
  monthlySpendTrend,
  formatCurrencyCompact,
  getTimeframeEnd,
  computePaymentIssues,
} from "./expense-analytics";

// Minimal factories — only the fields the analytics functions read.
function schedule(overrides: Partial<PaymentSchedule> = {}): PaymentSchedule {
  return {
    amount: "100.00",
    frequency: "monthly",
    nextDueDate: new Date("2026-06-10"),
    status: "scheduled",
    isActive: true,
    expenseTypeId: "et1",
    internalCompanyId: "co1",
    paymentAccountId: "acc1",
    ...overrides,
  } as PaymentSchedule;
}

function record(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    amount: "100.00",
    paymentDate: new Date("2026-06-10"),
    ...overrides,
  } as PaymentRecord;
}

describe("parseAmount", () => {
  it("parses numeric strings", () => {
    expect(parseAmount("123.45")).toBe(123.45);
  });
  it("passes numbers through", () => {
    expect(parseAmount(50)).toBe(50);
  });
  it("returns 0 for null/undefined/garbage", () => {
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });
});

describe("MONTHLY_FACTOR", () => {
  it("normalises cadences to per-month", () => {
    expect(MONTHLY_FACTOR.monthly).toBe(1);
    expect(MONTHLY_FACTOR.quarterly).toBeCloseTo(1 / 3);
    expect(MONTHLY_FACTOR.yearly).toBeCloseTo(1 / 12);
    expect(MONTHLY_FACTOR["bi-weekly"]).toBeCloseTo(26 / 12);
    expect(MONTHLY_FACTOR["one-time"]).toBe(0);
  });
  it("does not include weekly (not supported in -next)", () => {
    expect(MONTHLY_FACTOR.weekly).toBeUndefined();
  });
});

describe("isActive", () => {
  it("is false when completed", () => {
    expect(isActive(schedule({ status: "completed" }))).toBe(false);
  });
  it("is false when isActive flag is false", () => {
    expect(isActive(schedule({ isActive: false }))).toBe(false);
  });
  it("is true for a scheduled active obligation", () => {
    expect(isActive(schedule())).toBe(true);
  });
});

describe("advance", () => {
  it("advances by one interval per frequency", () => {
    expect(advance(new Date("2026-01-01"), "monthly")).toEqual(new Date("2026-02-01"));
    expect(advance(new Date("2026-01-01"), "bi-weekly")).toEqual(new Date("2026-01-15"));
    expect(advance(new Date("2026-01-01"), "quarterly")).toEqual(new Date("2026-04-01"));
    expect(advance(new Date("2026-01-01"), "yearly")).toEqual(new Date("2027-01-01"));
  });
  it("returns null for one-time", () => {
    expect(advance(new Date("2026-01-01"), "one-time")).toBeNull();
  });
});

describe("monthlyRunRate", () => {
  it("sums recurring schedules normalised to monthly, excluding one-time", () => {
    const rate = monthlyRunRate([
      schedule({ amount: "100", frequency: "monthly" }),
      schedule({ amount: "1200", frequency: "yearly" }), // 100/mo
      schedule({ amount: "500", frequency: "one-time" }), // excluded
    ]);
    expect(rate).toBeCloseTo(200);
  });
  it("excludes inactive and completed schedules", () => {
    const rate = monthlyRunRate([
      schedule({ amount: "100", frequency: "monthly" }),
      schedule({ amount: "100", frequency: "monthly", isActive: false }),
      schedule({ amount: "100", frequency: "monthly", status: "completed" }),
    ]);
    expect(rate).toBeCloseTo(100);
  });
});

describe("projectOccurrences", () => {
  it("includes a one-time occurrence only if inside the window", () => {
    const s = schedule({ frequency: "one-time", nextDueDate: new Date("2026-06-15") });
    expect(projectOccurrences(s, new Date("2026-06-01"), new Date("2026-06-30"))).toHaveLength(1);
    expect(projectOccurrences(s, new Date("2026-07-01"), new Date("2026-07-31"))).toHaveLength(0);
  });
  it("rolls a monthly schedule forward across the window", () => {
    const s = schedule({ frequency: "monthly", nextDueDate: new Date("2026-06-10") });
    const occ = projectOccurrences(s, new Date("2026-06-01"), new Date("2026-08-31"));
    expect(occ).toHaveLength(3); // Jun, Jul, Aug
  });
  it("advances a past next-due-date up to the window start", () => {
    const s = schedule({ frequency: "monthly", nextDueDate: new Date("2026-01-10") });
    const occ = projectOccurrences(s, new Date("2026-06-01"), new Date("2026-06-30"));
    expect(occ).toHaveLength(1);
    expect(occ[0].getMonth()).toBe(5); // June
  });
});

describe("monthlyForecast", () => {
  it("buckets projected spend by calendar month from the current month", () => {
    const now = new Date("2026-06-01");
    const buckets = monthlyForecast([schedule({ amount: "100", frequency: "monthly", nextDueDate: new Date("2026-06-10") })], now, 3);
    expect(buckets).toHaveLength(3);
    expect(buckets[0].total).toBeCloseTo(100); // June occurrence (06-10) is still ahead of now
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(3); // Jun, Jul, Aug
  });
});

describe("breakdownBy", () => {
  it("groups active amounts by key, sorted largest first", () => {
    const slices = breakdownBy(
      [
        schedule({ amount: "100", expenseTypeId: "a" }),
        schedule({ amount: "300", expenseTypeId: "b" }),
        schedule({ amount: "50", expenseTypeId: "a" }),
      ],
      (s) => s.expenseTypeId,
      (k) => k.toUpperCase(),
    );
    expect(slices[0]).toMatchObject({ key: "b", value: 300, count: 1 });
    expect(slices[1]).toMatchObject({ key: "a", value: 150, count: 2, label: "A" });
  });
});

describe("monthlySpendTrend", () => {
  it("buckets actual paid amounts by month for the trailing window", () => {
    const now = new Date("2026-06-15");
    const points = monthlySpendTrend(
      [record({ amount: "100", paymentDate: new Date("2026-06-05") }), record({ amount: "200", paymentDate: new Date("2026-05-05") })],
      now,
      3,
    );
    expect(points).toHaveLength(3); // Apr, May, Jun
    expect(points[2].total).toBeCloseTo(100); // current month
    expect(points[1].total).toBeCloseTo(200);
  });
});

describe("formatCurrencyCompact", () => {
  it("formats thousands and millions compactly", () => {
    expect(formatCurrencyCompact(1234)).toBe("$1.2k");
    expect(formatCurrencyCompact(3_400_000)).toBe("$3.4M");
    expect(formatCurrencyCompact(50)).toBe("$50");
  });
});

describe("getTimeframeEnd", () => {
  const start = new Date("2026-06-01");
  it("advances by the timeframe window", () => {
    expect(getTimeframeEnd("week", start)).toEqual(new Date("2026-06-08"));
    expect(getTimeframeEnd("month", start)).toEqual(new Date("2026-07-01"));
    expect(getTimeframeEnd("quarter", start)).toEqual(new Date("2026-09-01"));
    expect(getTimeframeEnd("year", start)).toEqual(new Date("2027-06-01"));
  });
});

describe("computePaymentIssues", () => {
  const now = new Date("2026-06-15");
  const co = () => "Acme";

  it("flags an overdue active schedule", () => {
    const issues = computePaymentIssues(
      [schedule({ expenseId: "E1", nextDueDate: new Date("2026-06-01") })],
      [],
      now,
      co,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "overdue", expenseId: "E1", companyName: "Acme" });
  });

  it("ignores completed and inactive schedules", () => {
    const issues = computePaymentIssues(
      [
        schedule({ expenseId: "E1", nextDueDate: new Date("2026-06-01"), status: "completed" }),
        schedule({ expenseId: "E2", nextDueDate: new Date("2026-06-01"), isActive: false }),
      ],
      [],
      now,
      co,
    );
    expect(issues).toHaveLength(0);
  });

  it("flags underpaid and overpaid against the latest record", () => {
    const under = computePaymentIssues(
      [schedule({ expenseId: "E1", amount: "100", nextDueDate: new Date("2026-07-01") })],
      [record({ expenseId: "E1", amount: "60", paymentDate: new Date("2026-06-10") })],
      now,
      co,
    );
    expect(under.map((i) => i.type)).toEqual(["underpaid"]);

    const over = computePaymentIssues(
      [schedule({ expenseId: "E1", amount: "100", nextDueDate: new Date("2026-07-01") })],
      [record({ expenseId: "E1", amount: "140", paymentDate: new Date("2026-06-10") })],
      now,
      co,
    );
    expect(over.map((i) => i.type)).toEqual(["overpaid"]);
  });

  it("flags a late payment from daysLate", () => {
    const issues = computePaymentIssues(
      [schedule({ id: "s1", expenseId: "E1", amount: "100", nextDueDate: new Date("2026-07-01") })],
      [record({ expenseId: "E1", paymentScheduleId: "s1", amount: "100", paymentDate: new Date("2026-06-10"), daysLate: 3 })],
      now,
      co,
    );
    expect(issues.map((i) => i.type)).toEqual(["late"]);
  });

  it("sorts by priority overdue → late → underpaid → overpaid", () => {
    const issues = computePaymentIssues(
      [
        schedule({ id: "s1", expenseId: "OVERDUE", amount: "100", nextDueDate: new Date("2026-06-01") }),
        schedule({ id: "s2", expenseId: "UNDER", amount: "100", nextDueDate: new Date("2026-07-01") }),
        schedule({ id: "s3", expenseId: "LATE", amount: "100", nextDueDate: new Date("2026-07-01") }),
      ],
      [
        record({ expenseId: "UNDER", amount: "50", paymentDate: new Date("2026-06-10") }),
        record({ expenseId: "LATE", paymentScheduleId: "s3", amount: "100", paymentDate: new Date("2026-06-10"), daysLate: 2 }),
      ],
      now,
      co,
    );
    expect(issues.map((i) => i.type)).toEqual(["overdue", "late", "underpaid"]);
  });
});
