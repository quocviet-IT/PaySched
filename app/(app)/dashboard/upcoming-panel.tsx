"use client";

import * as React from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarDays, AlertCircle, CalendarClock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/expense-analytics";

export type UpcomingStatus = "overdue" | "due-soon" | "scheduled";

export interface UpcomingPaymentItem {
  id: string;
  vendorName: string;
  expenseId: string;
  companyLabel?: string;
  expenseTypeLabel?: string;
  amount: number;
  dueDate: Date;
  status: UpcomingStatus;
}

export interface UpcomingCompanyRow {
  companyId: string;
  companyName: string;
  totalAmount: number;
  scheduledCount: number;
  soonestDue?: Date;
}

export type UpcomingView = "company" | "list";

const STATUS_STYLES: Record<UpcomingStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "text-hp-pink" },
  "due-soon": { label: "Due soon", className: "text-hp-ink" },
  scheduled: { label: "Scheduled", className: "text-hp-muted" },
};

function relativeDue(dueDate: Date, now: Date): string {
  const days = differenceInCalendarDays(dueDate, now);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

export function UpcomingPanel({
  view,
  onViewChange,
  windowLabel,
  items,
  byCompany,
  now,
  onRecordPayment,
  onSelectCompany,
}: {
  view: UpcomingView;
  onViewChange: (view: UpcomingView) => void;
  windowLabel: string;
  items: UpcomingPaymentItem[];
  byCompany: UpcomingCompanyRow[];
  now: Date;
  onRecordPayment?: (id: string) => void;
  onSelectCompany?: (companyId: string, companyName: string) => void;
}) {
  const total =
    view === "company"
      ? byCompany.reduce((sum, row) => sum + row.totalAmount, 0)
      : items.reduce((sum, item) => sum + item.amount, 0);
  const count =
    view === "company"
      ? byCompany.reduce((sum, row) => sum + row.scheduledCount, 0)
      : items.length;

  return (
    <div className="bg-hp-card p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-hp-pink" />
            <span className="eyebrow">Upcoming Payments</span>
          </div>
          <p className="mt-2 text-sm text-hp-body">Obligations due · {windowLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {count > 0 && (
            <div className="text-right">
              <div className="font-title text-[18px] leading-none tabular-nums text-hp-ink">{formatCurrency(total)}</div>
              <p className="mt-1 text-[11px] uppercase tracking-eyebrow text-hp-muted">
                {count} payment{count === 1 ? "" : "s"}
              </p>
            </div>
          )}
          <div className="flex border border-hp-rule">
            {(["company", "list"] as UpcomingView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  "px-3 py-1.5 text-[11px] uppercase tracking-eyebrow transition-colors",
                  view === v ? "bg-hp-ink text-hp-card" : "text-hp-muted hover:text-hp-ink",
                )}
              >
                {v === "company" ? "By Company" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {view === "company" ? (
          byCompany.length === 0 ? (
            <EmptyState title="Nothing due in this window" subtitle="No scheduled payments fall within the selected timeframe" />
          ) : (
            <div className="border border-hp-rule">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Internal Company</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Soonest Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCompany.map((row) => (
                    <TableRow
                      key={row.companyId}
                      className={onSelectCompany ? "cursor-pointer hover:bg-hp-inset" : undefined}
                      onClick={() => onSelectCompany?.(row.companyId, row.companyName)}
                    >
                      <TableCell className="text-hp-ink">{row.companyName}</TableCell>
                      <TableCell className="text-right text-hp-muted tabular-nums">
                        {row.scheduledCount} {row.scheduledCount === 1 ? "item" : "items"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-hp-ink">{formatCurrency(row.totalAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-hp-muted">
                        {row.soonestDue ? format(row.soonestDue, "MMM dd, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : items.length === 0 ? (
          <EmptyState title="Nothing due in this window" subtitle="You're all caught up on upcoming payments" />
        ) : (
          <ul className="divide-y divide-hp-rule">
            {items.map((item) => {
              const style = STATUS_STYLES[item.status];
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 uppercase tracking-eyebrow text-[10px] ${style.className}`}>
                        {item.status === "overdue" && <AlertCircle className="h-3 w-3" />}
                        {style.label}
                      </span>
                      <span className="truncate text-hp-ink">{item.vendorName}</span>
                      {item.expenseTypeLabel && <span className="truncate text-xs text-hp-muted">{item.expenseTypeLabel}</span>}
                    </div>
                    <p className="mt-1 text-xs text-hp-muted">
                      {item.companyLabel ? `${item.companyLabel} · ` : ""}
                      {relativeDue(item.dueDate, now)} · {format(item.dueDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="tabular-nums text-hp-ink">{formatCurrency(item.amount)}</div>
                  {onRecordPayment && (
                    <Button variant="secondary" size="sm" onClick={() => onRecordPayment(item.id)}>
                      Record
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-hp-rule py-12 text-center">
      <CalendarClock className="mb-3 h-9 w-9 text-hp-muted" />
      <p className="text-sm font-medium text-hp-ink">{title}</p>
      <p className="text-xs text-hp-muted">{subtitle}</p>
    </div>
  );
}
