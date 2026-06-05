"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, differenceInDays, format, isSameMonth } from "date-fns";
import { Wallet, CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  PaymentSchedule,
  PaymentRecord,
  InternalCompany,
  PaymentAccount,
  PaymentType,
  ExpenseType,
} from "@shared/schema";
import {
  monthlyRunRate,
  monthlyForecast,
  monthlySpendTrend,
  breakdownBy,
  projectOccurrences,
  isRecurring,
  parseAmount,
  formatCurrency,
  formatCurrencyWhole,
  computePaymentIssues,
  getTimeframeEnd,
  MONTHLY_FACTOR,
  FREQUENCY_LABELS,
  TIMEFRAME_LABELS,
  type Timeframe,
  type ForecastBucket,
  type TrendPoint,
} from "@/lib/expense-analytics";
import { ExpenseForecastChart } from "./charts/expense-forecast-chart";
import { ExpenseBreakdownChart, type BreakdownSelection } from "./charts/expense-breakdown-chart";
import { SpendTrendChart } from "./charts/spend-trend-chart";
import { DrillDownDialog, type DrillDownConfig, type DrillEntry } from "./drill-down-dialog";
import { ExpenseDetailDialog, type ExpenseDetailData } from "./expense-detail-dialog";
import {
  UpcomingPanel,
  type UpcomingPaymentItem,
  type UpcomingCompanyRow,
  type UpcomingStatus,
  type UpcomingView,
} from "./upcoming-panel";
import { PaymentIssuesPanel } from "./payment-issues-panel";
import { SchedulesPanel } from "./schedules-panel";
import { HistoryPanel } from "./history-panel";

const UPCOMING_LIST_LIMIT = 8;

type ScheduleStatus = "paid" | "due-soon" | "overdue" | "scheduled";

function statusOf(schedule: PaymentSchedule, now: Date): ScheduleStatus {
  if (schedule.status === "completed") return "paid";
  const daysUntil = differenceInDays(new Date(schedule.nextDueDate), now);
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 7) return "due-soon";
  return "scheduled";
}

export function DashboardView({ isAdmin, sessionUserId }: { isAdmin: boolean; sessionUserId: string }) {
  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });
  const { data: records = [] } = useQuery<PaymentRecord[]>({ queryKey: ["/api/payment-records"] });
  const { data: companies = [] } = useQuery<InternalCompany[]>({ queryKey: ["/api/internal-companies"] });
  const { data: accounts = [] } = useQuery<PaymentAccount[]>({ queryKey: ["/api/payment-accounts"] });
  const { data: paymentTypes = [] } = useQuery<PaymentType[]>({ queryKey: ["/api/payment-types"] });
  const { data: expenseTypes = [] } = useQuery<ExpenseType[]>({ queryKey: ["/api/expense-types"] });

  // Stable "now" so memoised analytics don't shift on every render.
  const now = React.useMemo(() => new Date(), []);

  const [activeTab, setActiveTab] = React.useState("overview");
  const [timeframe, setTimeframe] = React.useState<Timeframe>("month");
  const [upcomingView, setUpcomingView] = React.useState<UpcomingView>("company");
  const [drillDown, setDrillDown] = React.useState<DrillDownConfig | null>(null);
  const [detail, setDetail] = React.useState<ExpenseDetailData | null>(null);
  const [editScheduleId, setEditScheduleId] = React.useState<string | null>(null);
  const [recordScheduleId, setRecordScheduleId] = React.useState<string | null>(null);

  const timeframeEnd = React.useMemo(() => getTimeframeEnd(timeframe, now), [timeframe, now]);

  const companyName = React.useCallback(
    (id: string) => companies.find((c) => c.id === id)?.name ?? "Unknown company",
    [companies],
  );
  const expenseTypeName = React.useCallback(
    (id: string) => expenseTypes.find((t) => t.id === id)?.name ?? "Uncategorized",
    [expenseTypes],
  );
  const paymentTypeName = React.useCallback(
    (id: string) => paymentTypes.find((t) => t.id === id)?.name ?? "—",
    [paymentTypes],
  );
  const accountLabel = React.useCallback(
    (id: string) => {
      const account = accounts.find((a) => a.id === id);
      if (!account) return "Unknown account";
      return account.lastFourDigits ? `${account.name} (*${account.lastFourDigits})` : account.name;
    },
    [accounts],
  );

  // ---- Analytics ----
  const runRate = React.useMemo(() => monthlyRunRate(schedules), [schedules]);
  const forecast = React.useMemo(
    () => monthlyForecast(schedules, now, timeframe === "year" ? 12 : 6),
    [schedules, now, timeframe],
  );
  const spendTrend = React.useMemo(() => monthlySpendTrend(records, now, 6), [records, now]);

  const breakdownByType = React.useMemo(
    () => breakdownBy(schedules, (s) => s.expenseTypeId, expenseTypeName),
    [schedules, expenseTypeName],
  );
  const breakdownByCompany = React.useMemo(
    () => breakdownBy(schedules, (s) => s.internalCompanyId, companyName),
    [schedules, companyName],
  );
  const breakdownByAccount = React.useMemo(
    () => breakdownBy(schedules, (s) => s.paymentAccountId, accountLabel),
    [schedules, accountLabel],
  );

  // ---- KPI figures (active schedules only) ----
  const activeSchedules = React.useMemo(
    () => schedules.filter((s) => s.isActive !== false && s.status !== "completed"),
    [schedules],
  );

  const overdue = React.useMemo(() => {
    const items = activeSchedules.filter((s) => statusOf(s, now) === "overdue");
    return { count: items.length, amount: items.reduce((sum, s) => sum + parseAmount(s.amount), 0) };
  }, [activeSchedules, now]);

  const upcomingInTimeframe = React.useMemo(() => {
    const items = activeSchedules.filter((s) => {
      if (statusOf(s, now) === "overdue") return false;
      const due = new Date(s.nextDueDate);
      return due >= now && due <= timeframeEnd;
    });
    return { count: items.length, amount: items.reduce((sum, s) => sum + parseAmount(s.amount), 0) };
  }, [activeSchedules, now, timeframeEnd]);

  const paidThisMonth = React.useMemo(() => {
    const items = records.filter((r) => {
      const d = new Date(r.paymentDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return { count: items.length, amount: items.reduce((sum, r) => sum + parseAmount(r.amount), 0) };
  }, [records, now]);

  // ---- Payment issues ----
  const issues = React.useMemo(
    () => computePaymentIssues(schedules, records, now, (id) => companies.find((c) => c.id === id)?.name),
    [schedules, records, now, companies],
  );

  // ---- Upcoming list + by-company (timeframe-scoped) ----
  const upcomingItems = React.useMemo<UpcomingPaymentItem[]>(() => {
    return activeSchedules
      .map((s) => ({ s, st: statusOf(s, now), due: new Date(s.nextDueDate) }))
      .filter(({ due }) => due <= timeframeEnd)
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, UPCOMING_LIST_LIMIT)
      .map(({ s, st, due }) => ({
        id: s.id,
        vendorName: s.vendorName,
        expenseId: s.expenseId,
        companyLabel: companyName(s.internalCompanyId),
        expenseTypeLabel: expenseTypeName(s.expenseTypeId),
        amount: parseAmount(s.amount),
        dueDate: due,
        status: st as UpcomingStatus,
      }));
  }, [activeSchedules, now, timeframeEnd, companyName, expenseTypeName]);

  const upcomingByCompany = React.useMemo<UpcomingCompanyRow[]>(() => {
    const groups = new Map<string, UpcomingCompanyRow>();
    activeSchedules.forEach((s) => {
      const due = new Date(s.nextDueDate);
      if (due < now || due > timeframeEnd) return;
      const id = s.internalCompanyId;
      const existing = groups.get(id) ?? { companyId: id, companyName: companyName(id), totalAmount: 0, scheduledCount: 0, soonestDue: undefined };
      existing.totalAmount += parseAmount(s.amount);
      existing.scheduledCount += 1;
      if (!existing.soonestDue || due < existing.soonestDue) existing.soonestDue = due;
      groups.set(id, existing);
    });
    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [activeSchedules, now, timeframeEnd, companyName]);

  // ---- Drill-down entry builders ----
  const scheduleToEntry = React.useCallback(
    (s: PaymentSchedule, date?: Date, amountOverride?: number): DrillEntry => ({
      id: date ? `${s.id}-${date.getTime()}` : s.id,
      scheduleId: s.id,
      vendor: s.vendorName,
      company: companyName(s.internalCompanyId),
      expenseType: expenseTypeName(s.expenseTypeId),
      account: accountLabel(s.paymentAccountId),
      amount: amountOverride ?? parseAmount(s.amount),
      date: date ?? new Date(s.nextDueDate),
      status: statusOf(s, now),
    }),
    [companyName, expenseTypeName, accountLabel, now],
  );

  const recordToEntry = React.useCallback(
    (r: PaymentRecord): DrillEntry => {
      const schedule =
        schedules.find((s) => s.id === r.paymentScheduleId) ??
        schedules.find((s) => s.expenseId === r.expenseId);
      return {
        id: r.id,
        recordId: r.id,
        vendor: schedule?.vendorName ?? r.expenseId,
        company: companyName(r.internalCompanyId ?? schedule?.internalCompanyId ?? ""),
        expenseType: schedule ? expenseTypeName(schedule.expenseTypeId) : "—",
        account: r.paymentAccountId ? accountLabel(r.paymentAccountId) : "—",
        amount: parseAmount(r.amount),
        date: new Date(r.paymentDate),
      };
    },
    [schedules, companyName, expenseTypeName, accountLabel],
  );

  // ---- KPI drill-downs ----
  const handleRunRateDrill = () => {
    const entries = schedules
      .filter((s) => statusOf(s, now) !== "paid" && s.isActive !== false && isRecurring(s.frequency))
      .map((s) => scheduleToEntry(s, new Date(s.nextDueDate), parseAmount(s.amount) * (MONTHLY_FACTOR[s.frequency] ?? 0)))
      .sort((a, b) => b.amount - a.amount);
    setDrillDown({ title: "Monthly run-rate", description: "Recurring schedules, each normalized to a monthly amount", dateLabel: "Next due", entries });
  };

  const handleUpcomingDrill = () => {
    const entries = schedules
      .filter((s) => {
        const st = statusOf(s, now);
        if (st === "paid" || st === "overdue" || s.isActive === false) return false;
        const due = new Date(s.nextDueDate);
        return due >= now && due <= timeframeEnd;
      })
      .map((s) => scheduleToEntry(s))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    setDrillDown({ title: `Upcoming · ${TIMEFRAME_LABELS[timeframe]}`, description: `Scheduled payments coming due in the ${TIMEFRAME_LABELS[timeframe].toLowerCase()}`, dateLabel: "Due date", entries });
  };

  const handleOverdueDrill = () => {
    const entries = schedules
      .filter((s) => statusOf(s, now) === "overdue" && s.isActive !== false)
      .map((s) => scheduleToEntry(s))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    setDrillDown({ title: "Overdue payments", description: "Schedules that are past their due date", dateLabel: "Due date", entries });
  };

  const handlePaidDrill = () => {
    const entries = records
      .filter((r) => {
        const d = new Date(r.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .map(recordToEntry)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    setDrillDown({ title: "Paid this month", description: "Payments recorded this calendar month", dateLabel: "Payment date", entries });
  };

  const handleCompanyDrill = (companyId: string, name: string) => {
    const entries = schedules
      .filter((s) => {
        if (statusOf(s, now) === "paid" || s.isActive === false) return false;
        if (s.internalCompanyId !== companyId) return false;
        const due = new Date(s.nextDueDate);
        return due >= now && due <= timeframeEnd;
      })
      .map((s) => scheduleToEntry(s))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    setDrillDown({ title: `Upcoming · ${name}`, description: `Scheduled payments due ${format(now, "MMM dd")} → ${format(timeframeEnd, "MMM dd, yyyy")}`, dateLabel: "Due date", entries });
  };

  // ---- Chart drill-downs ----
  const handleForecastMonth = (bucket: ForecastBucket) => {
    const start = bucket.monthStart;
    const end = addMonths(start, 1);
    const entries: DrillEntry[] = [];
    schedules.forEach((s) => {
      if (statusOf(s, now) === "paid" || s.isActive === false) return;
      projectOccurrences(s, start, end)
        .filter((d) => isSameMonth(d, start))
        .forEach((date) => entries.push(scheduleToEntry(s, date)));
    });
    entries.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    setDrillDown({ title: `Projected expenses · ${format(start, "MMMM yyyy")}`, description: "Scheduled payments (including recurring) projected to fall in this month", dateLabel: "Projected date", entries });
  };

  const handleBreakdownSelect = (sel: BreakdownSelection) => {
    const keys = new Set(sel.memberKeys);
    const keyOf = (s: PaymentSchedule) =>
      sel.dimension === "type" ? s.expenseTypeId : sel.dimension === "company" ? s.internalCompanyId : s.paymentAccountId;
    const entries = schedules
      .filter((s) => statusOf(s, now) !== "paid" && s.isActive !== false && keys.has(keyOf(s)))
      .map((s) => scheduleToEntry(s))
      .sort((a, b) => b.amount - a.amount);
    setDrillDown({ title: sel.label, description: `Active scheduled payments for this ${sel.dimension}`, dateLabel: "Next due", entries });
  };

  const handleTrendMonth = (point: TrendPoint) => {
    const entries = records
      .filter((r) => isSameMonth(new Date(r.paymentDate), point.monthStart))
      .map(recordToEntry)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    setDrillDown({ title: `Payments recorded · ${format(point.monthStart, "MMMM yyyy")}`, description: "Actual payments recorded in this month", dateLabel: "Payment date", entries });
  };

  // ---- Row detail ----
  const buildScheduleDetail = React.useCallback(
    (scheduleId: string, highlightId?: string): ExpenseDetailData | null => {
      const s = schedules.find((x) => x.id === scheduleId);
      if (!s) return null;
      const history = records
        .filter((r) => r.paymentScheduleId === s.id || (!r.paymentScheduleId && r.expenseId === s.expenseId))
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        .map((r) => ({
          id: r.id,
          date: format(new Date(r.paymentDate), "MMM dd, yyyy"),
          amount: formatCurrency(parseAmount(r.amount)),
          method: r.paymentMethod,
          account: r.paymentAccountId ? accountLabel(r.paymentAccountId) : undefined,
          daysLate: Number(r.daysLate ?? 0),
          hasConfirmation: !!r.confirmationFile,
        }));
      return {
        vendor: s.vendorName,
        expenseId: s.expenseId,
        status: statusOf(s, now),
        scheduleId: s.id,
        active: s.isActive !== false,
        fields: [
          { label: "Company", value: companyName(s.internalCompanyId) },
          { label: "Expense type", value: expenseTypeName(s.expenseTypeId) },
          { label: "Amount", value: formatCurrency(parseAmount(s.amount)) },
          { label: "Frequency", value: FREQUENCY_LABELS[s.frequency] ?? s.frequency },
          { label: "Next due", value: format(new Date(s.nextDueDate), "MMM dd, yyyy") },
          { label: "Payment account", value: accountLabel(s.paymentAccountId) },
          { label: "Payment type", value: paymentTypeName(s.paymentTypeId) },
        ],
        history,
        highlightId,
      };
    },
    [schedules, records, companyName, expenseTypeName, accountLabel, paymentTypeName, now],
  );

  const buildRecordDetail = React.useCallback(
    (recordId: string): ExpenseDetailData | null => {
      const r = records.find((x) => x.id === recordId);
      if (!r) return null;
      const schedule =
        schedules.find((s) => s.id === r.paymentScheduleId) ??
        schedules.find((s) => s.expenseId === r.expenseId);
      if (schedule) return buildScheduleDetail(schedule.id, r.id);
      return {
        vendor: r.expenseId,
        expenseId: r.expenseId,
        fields: [
          { label: "Company", value: companyName(r.internalCompanyId ?? "") },
          { label: "Amount", value: formatCurrency(parseAmount(r.amount)) },
          { label: "Payment date", value: format(new Date(r.paymentDate), "MMM dd, yyyy") },
          { label: "Payment method", value: r.paymentMethod },
          { label: "Payment account", value: r.paymentAccountId ? accountLabel(r.paymentAccountId) : "—" },
        ],
        history: [
          {
            id: r.id,
            date: format(new Date(r.paymentDate), "MMM dd, yyyy"),
            amount: formatCurrency(parseAmount(r.amount)),
            method: r.paymentMethod,
            account: r.paymentAccountId ? accountLabel(r.paymentAccountId) : undefined,
            daysLate: Number(r.daysLate ?? 0),
            hasConfirmation: !!r.confirmationFile,
          },
        ],
        highlightId: r.id,
      };
    },
    [records, schedules, companyName, accountLabel, buildScheduleDetail],
  );

  const handleOpenEntry = (entry: DrillEntry) => {
    const built = entry.scheduleId
      ? buildScheduleDetail(entry.scheduleId, entry.recordId)
      : entry.recordId
      ? buildRecordDetail(entry.recordId)
      : null;
    if (built) setDetail(built);
  };

  const handleEditFromDetail = (scheduleId: string) => {
    setDetail(null);
    setDrillDown(null);
    setActiveTab("schedules");
    setEditScheduleId(scheduleId);
  };

  const handleRecordForSchedule = (scheduleId: string) => {
    setActiveTab("schedules");
    setRecordScheduleId(scheduleId);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">Overview</span>
          <h1 className="font-title text-[32px] leading-tight text-hp-ink">Expense Dashboard</h1>
          <p className="mt-2 text-sm text-hp-muted">Upcoming obligations, spending breakdown, and payment activity</p>
        </div>
        <div className="flex flex-wrap border border-hp-rule">
          {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeframe(value)}
              className={cn(
                "px-3 py-1.5 text-[11px] uppercase tracking-eyebrow transition-colors",
                timeframe === value ? "bg-hp-ink text-hp-card" : "text-hp-muted hover:text-hp-ink",
              )}
            >
              {TIMEFRAME_LABELS[value]}
            </button>
          ))}
        </div>
      </header>

      {/* Dollar KPI row (clickable → drill-down) */}
      <div className="grid grid-cols-1 gap-px bg-hp-rule md:grid-cols-2 lg:grid-cols-4">
        <MoneyStatCard label="Monthly Run-Rate" value={formatCurrencyWhole(runRate)} sub="Recurring commitments / month" icon={<Wallet className="h-4 w-4" />} onClick={handleRunRateDrill} />
        <MoneyStatCard label="Upcoming" value={formatCurrencyWhole(upcomingInTimeframe.amount)} sub={`${upcomingInTimeframe.count} due · ${TIMEFRAME_LABELS[timeframe]}`} icon={<CalendarClock className="h-4 w-4" />} onClick={handleUpcomingDrill} />
        <MoneyStatCard label="Overdue" value={formatCurrencyWhole(overdue.amount)} sub={`${overdue.count} item${overdue.count === 1 ? "" : "s"} past due`} accent={overdue.count > 0} icon={<AlertCircle className="h-4 w-4" />} onClick={handleOverdueDrill} />
        <MoneyStatCard label="Paid This Month" value={formatCurrencyWhole(paidThisMonth.amount)} sub={`${paidThisMonth.count} payment${paidThisMonth.count === 1 ? "" : "s"} recorded`} icon={<CheckCircle2 className="h-4 w-4" />} onClick={handlePaidDrill} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ExpenseForecastChart data={forecast} onSelectMonth={handleForecastMonth} />
            </div>
            <ExpenseBreakdownChart byType={breakdownByType} byCompany={breakdownByCompany} byAccount={breakdownByAccount} onSelect={handleBreakdownSelect} />
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <UpcomingPanel
              view={upcomingView}
              onViewChange={setUpcomingView}
              windowLabel={`Overdue + ${TIMEFRAME_LABELS[timeframe].toLowerCase()}`}
              items={upcomingItems}
              byCompany={upcomingByCompany}
              now={now}
              onRecordPayment={handleRecordForSchedule}
              onSelectCompany={handleCompanyDrill}
            />
            <PaymentIssuesPanel
              issues={issues}
              onSelect={(scheduleId) => {
                const built = buildScheduleDetail(scheduleId);
                if (built) setDetail(built);
              }}
            />
          </div>
          <SpendTrendChart data={spendTrend} onSelectMonth={handleTrendMonth} />
        </TabsContent>

        <TabsContent value="schedules">
          <SchedulesPanel
            isAdmin={isAdmin}
            editScheduleId={editScheduleId}
            onEditConsumed={() => setEditScheduleId(null)}
            recordScheduleId={recordScheduleId}
            onRecordConsumed={() => setRecordScheduleId(null)}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistoryPanel isAdmin={isAdmin} sessionUserId={sessionUserId} />
        </TabsContent>
      </Tabs>

      <DrillDownDialog config={drillDown} onOpenChange={(open) => !open && setDrillDown(null)} onOpenEntry={handleOpenEntry} />
      <ExpenseDetailDialog data={detail} onOpenChange={(open) => !open && setDetail(null)} onEdit={handleEditFromDetail} />
    </div>
  );
}

function MoneyStatCard({
  label, value, sub, accent, icon, onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      {icon && <span className={`absolute right-5 top-5 ${accent ? "text-hp-pink" : "text-hp-muted"}`}>{icon}</span>}
      <span className="eyebrow mb-3">{label}</span>
      <div className={`mt-2 font-title text-[36px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>{value}</div>
      {sub && <div className="mt-3 text-[11px] uppercase tracking-eyebrow text-hp-muted">{sub}</div>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="relative bg-hp-card p-7 text-left transition-colors hover:bg-hp-inset focus-visible:outline-none">
        {body}
      </button>
    );
  }
  return <div className="bg-hp-card p-7 relative">{body}</div>;
}
