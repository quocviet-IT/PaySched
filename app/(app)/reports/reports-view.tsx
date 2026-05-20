"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentSchedule, PaymentRecord, InternalCompany } from "@shared/schema";

interface ReportsData {
  byMonth: { month: string; total: number; count: number }[];
  byCompany: { company: string; total: number }[];
  byExpense: { expenseType: string; total: number }[];
}

type IssueType = "overdue" | "late" | "underpaid" | "overpaid";
interface Issue {
  type: IssueType;
  schedule: PaymentSchedule;
  companyName: string | undefined;
  detail: string;
  daysLate?: number;
}

type Timeframe = "week" | "month" | "quarter" | "year";
const TIMEFRAMES: { value: Timeframe; label: string; days: number }[] = [
  { value: "week", label: "Next 7 Days", days: 7 },
  { value: "month", label: "Next 30 Days", days: 30 },
  { value: "quarter", label: "Next 90 Days", days: 90 },
  { value: "year", label: "Next 12 Months", days: 365 },
];

interface UpcomingGroup {
  companyId: string;
  companyName: string;
  totalAmount: number;
  scheduledCount: number;
  soonestDue: Date;
}

function computeUpcomingByCompany(
  schedules: PaymentSchedule[],
  companies: InternalCompany[],
  windowEnd: Date,
): UpcomingGroup[] {
  const now = new Date();
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const groups = new Map<string, UpcomingGroup>();

  for (const s of schedules) {
    if (s.status === "completed") continue;
    const due = new Date(s.nextDueDate);
    if (due < now || due > windowEnd) continue;
    const company = companyMap.get(s.internalCompanyId);
    if (!company) continue;

    const existing = groups.get(company.id);
    const amount = Number.parseFloat(s.amount) || 0;
    if (existing) {
      existing.totalAmount += amount;
      existing.scheduledCount += 1;
      if (due < existing.soonestDue) existing.soonestDue = due;
    } else {
      groups.set(company.id, {
        companyId: company.id,
        companyName: company.name,
        totalAmount: amount,
        scheduledCount: 1,
        soonestDue: due,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

const TOLERANCE = 0.01;
const PRIORITY: Record<IssueType, number> = { overdue: 0, late: 1, underpaid: 2, overpaid: 3 };

function computeIssues(
  schedules: PaymentSchedule[],
  records: PaymentRecord[],
  companies: InternalCompany[],
): Issue[] {
  const now = new Date();
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Pre-build O(1) lookup maps so the late-payment loop below is O(N) instead of O(N*M).
  const schedulesById = new Map(schedules.map((s) => [s.id, s]));
  const schedulesByExpense = new Map(schedules.map((s) => [s.expenseId, s]));

  // Track each schedule's latest payment record in a single pass over records.
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
      issues.push({ type: "overdue", schedule: s, companyName: company?.name, detail: `Due ${formatDate(dueDate)}` });
    }

    if (latest) {
      const paid = Number.parseFloat(latest.amount);
      const date = formatDate(latest.paymentDate);
      if (paid + TOLERANCE < scheduleAmount) {
        issues.push({
          type: "underpaid", schedule: s, companyName: company?.name,
          detail: `Paid ${formatCurrency(paid)} of ${formatCurrency(scheduleAmount)} on ${date}`,
        });
      } else if (paid > scheduleAmount + TOLERANCE) {
        issues.push({
          type: "overpaid", schedule: s, companyName: company?.name,
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
      type: "late", schedule, companyName: company?.name, daysLate: r.daysLate,
      detail: `Paid on ${formatDate(r.paymentDate)} (${r.daysLate} day${r.daysLate === 1 ? "" : "s"} late${
        dueDate ? `; due ${formatDate(dueDate)}` : ""
      })`,
    });
  }

  return issues.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
}

export function ReportsView() {
  const { data, isLoading } = useQuery<ReportsData>({ queryKey: ["/api/reports"] });
  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });
  const { data: records = [] } = useQuery<PaymentRecord[]>({ queryKey: ["/api/payment-records"] });
  const { data: companies = [] } = useQuery<InternalCompany[]>({ queryKey: ["/api/internal-companies"] });

  const [timeframe, setTimeframe] = React.useState<Timeframe>("month");

  const issues = React.useMemo(
    () => computeIssues(schedules, records, companies),
    [schedules, records, companies],
  );

  const { upcoming, windowStart, windowEnd } = React.useMemo(() => {
    const tf = TIMEFRAMES.find((t) => t.value === timeframe) ?? TIMEFRAMES[1];
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + tf.days);
    return {
      upcoming: computeUpcomingByCompany(schedules, companies, end),
      windowStart: start,
      windowEnd: end,
    };
  }, [schedules, companies, timeframe]);

  const upcomingTotal = upcoming.reduce((s, g) => s + g.totalAmount, 0);
  const upcomingCount = upcoming.reduce((s, g) => s + g.scheduledCount, 0);

  const totalAll = (data?.byMonth ?? []).reduce((s, r) => s + r.total, 0);
  const totalCount = (data?.byMonth ?? []).reduce((s, r) => s + r.count, 0);
  const avgPerTx = totalCount > 0 ? totalAll / totalCount : 0;

  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Analytics</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Reports</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle>Upcoming by company</CardTitle>
            <p className="text-sm text-hp-muted">
              {formatDate(windowStart)} → {formatDate(windowEnd)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 bg-hp-inset p-1">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeframe(t.value)}
                className={`px-3 py-1.5 uppercase tracking-eyebrow text-[11px] transition-colors ${
                  timeframe === t.value
                    ? "bg-hp-card text-hp-ink shadow-[0_1px_2px_rgba(42,39,37,0.08)]"
                    : "text-hp-muted hover:text-hp-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-hp-rule mb-5">
            <Stat label="Companies" value={String(upcoming.length)} />
            <Stat label="Due in timeframe" value={String(upcomingCount)} />
            <Stat label="Total expected" value={formatCurrency(upcomingTotal)} />
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-hp-muted">
              No scheduled payments in this timeframe.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Soonest due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((g) => (
                  <TableRow key={g.companyId}>
                    <TableCell className="text-hp-ink">{g.companyName}</TableCell>
                    <TableCell className="tabular-nums">{g.scheduledCount}</TableCell>
                    <TableCell>{formatDate(g.soonestDue)}</TableCell>
                    <TableCell className="text-right tabular-nums text-hp-ink">
                      {formatCurrency(g.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-px bg-hp-rule md:grid-cols-4">
        <Stat label="Total paid" value={formatCurrency(totalAll)} />
        <Stat label="Payments" value={String(totalCount)} />
        <Stat label="Average per payment" value={formatCurrency(avgPerTx)} />
        <Stat
          label="Open issues"
          value={String(issues.length)}
          accent={issues.length > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open issues</CardTitle>
          <p className="text-sm text-hp-muted">Schedules that need attention — overdue, late, or amount mismatches.</p>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <p className="py-6 text-center text-sm text-hp-muted">All schedules look healthy.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((iss, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className={`uppercase tracking-eyebrow text-[11px] ${
                        iss.type === "overdue" ? "text-hp-pink" :
                        iss.type === "late" ? "text-hp-ink" : "text-hp-body"
                      }`}>
                        {iss.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-hp-ink">{iss.schedule.vendorName}</TableCell>
                    <TableCell>{iss.companyName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-hp-body">{iss.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by month</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
          ) : (data?.byMonth?.length ?? 0) === 0 ? (
            <Empty body="No data yet — record your first payment to see the chart." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byMonth ?? []}>
                  <CartesianGrid stroke="var(--rule)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--ink-muted)"
                    style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em" }}
                  />
                  <YAxis
                    stroke="var(--ink-muted)"
                    style={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--rule)",
                      borderRadius: 0,
                      fontFamily: "var(--font-body), Cardo, serif",
                    }}
                    cursor={{ fill: "var(--surface-inset)" }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="total" fill="var(--ink-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Spending by company</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.byCompany ?? []).length === 0 ? (
              <Empty body="No data yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byCompany ?? [])
                    .sort((a, b) => b.total - a.total)
                    .map((r) => (
                      <TableRow key={r.company}>
                        <TableCell>{r.company}</TableCell>
                        <TableCell className="text-right tabular-nums text-hp-ink">
                          {formatCurrency(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by expense type</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.byExpense ?? []).length === 0 ? (
              <Empty body="No data yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byExpense ?? [])
                    .sort((a, b) => b.total - a.total)
                    .map((r) => (
                      <TableRow key={r.expenseType}>
                        <TableCell>{r.expenseType}</TableCell>
                        <TableCell className="text-right tabular-nums text-hp-ink">
                          {formatCurrency(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-hp-card p-7">
      <span className="eyebrow mb-3">{label}</span>
      <div className={`mt-2 font-title text-[28px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Empty({ body }: { body: string }) {
  return <p className="py-8 text-center text-sm text-hp-muted">{body}</p>;
}
