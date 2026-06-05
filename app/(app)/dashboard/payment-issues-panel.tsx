"use client";

import {
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, type IssueType, type PaymentIssue } from "@/lib/expense-analytics";

const TYPE_META: Record<IssueType, { label: string; className: string; Icon: typeof AlertCircle }> = {
  overdue: { label: "Overdue", className: "text-hp-pink", Icon: AlertCircle },
  late: { label: "Late Payment", className: "text-hp-ink", Icon: Clock3 },
  underpaid: { label: "Underpaid", className: "text-hp-ink", Icon: ArrowUpRight },
  overpaid: { label: "Overpaid", className: "text-hp-muted", Icon: TrendingUp },
};

export function PaymentIssuesPanel({
  issues,
  onSelect,
}: {
  issues: PaymentIssue[];
  onSelect?: (scheduleId: string) => void;
}) {
  return (
    <div className="bg-hp-card p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-hp-pink" />
            <span className="eyebrow">Payment Issues</span>
          </div>
          <p className="mt-2 text-sm text-hp-body">Overdue, late, underpaid, or overpaid items needing attention</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-1 uppercase tracking-eyebrow text-[10px] ${
            issues.length > 0 ? "border-hp-pink text-hp-pink" : "border-hp-rule text-hp-muted"
          }`}
        >
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center border border-dashed border-hp-rule py-12 text-center">
          <CheckCircle2 className="mb-3 h-9 w-9 text-hp-muted" />
          <p className="text-sm font-medium text-hp-ink">All clear</p>
          <p className="text-xs text-hp-muted">No payment issues detected</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {issues.map((issue) => {
            const meta = TYPE_META[issue.type];
            const { Icon } = meta;
            return (
              <div
                key={`${issue.scheduleId}-${issue.type}`}
                className={`border border-hp-rule p-4 ${onSelect ? "cursor-pointer hover:bg-hp-inset" : ""}`}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => onSelect?.(issue.scheduleId)}
                onKeyDown={
                  onSelect
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(issue.scheduleId);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 uppercase tracking-eyebrow text-[10px] ${meta.className}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <span className="text-hp-ink">{issue.vendorName}</span>
                      <span className="font-mono text-xs text-hp-muted">{issue.expenseId}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-hp-muted">{issue.companyName ?? "Unknown company"}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-[11px] uppercase tracking-eyebrow text-hp-muted">Scheduled</p>
                    <p className="font-title text-[18px] leading-none tabular-nums text-hp-ink">{formatCurrency(issue.amount)}</p>
                  </div>
                </div>
                <div className="my-3 h-px bg-hp-rule" />
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-hp-muted" />
                  <p className="text-sm text-hp-muted">{issue.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
