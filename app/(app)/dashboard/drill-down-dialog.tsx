"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/expense-analytics";

export type DrillStatus = "paid" | "due-soon" | "overdue" | "scheduled";

export interface DrillEntry {
  /** Unique per row. */
  id: string;
  /** Set when the row maps to a payment schedule (enables detail view). */
  scheduleId?: string;
  /** Set when the row maps to a payment record (enables detail view). */
  recordId?: string;
  vendor: string;
  company: string;
  expenseType: string;
  account: string;
  amount: number;
  date?: Date;
  status?: DrillStatus;
}

export interface DrillDownConfig {
  title: string;
  description?: string;
  /** Header label for the date column (e.g. "Next due", "Payment date"). */
  dateLabel: string;
  entries: DrillEntry[];
}

export const DRILL_STATUS_BADGE: Record<DrillStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "text-hp-pink" },
  "due-soon": { label: "Due soon", className: "text-hp-ink" },
  scheduled: { label: "Scheduled", className: "text-hp-muted" },
  paid: { label: "Paid", className: "text-hp-muted" },
};

const ALL = "__all__";

export function DrillDownDialog({
  config,
  onOpenChange,
  onOpenEntry,
}: {
  config: DrillDownConfig | null;
  onOpenChange: (open: boolean) => void;
  onOpenEntry: (entry: DrillEntry) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [company, setCompany] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);

  // Reset filters whenever a new drill-down is opened.
  React.useEffect(() => {
    setSearch("");
    setCompany(ALL);
    setType(ALL);
  }, [config]);

  const entries = config?.entries ?? [];

  const companies = React.useMemo(
    () => Array.from(new Set(entries.map((e) => e.company))).sort(),
    [entries],
  );
  const types = React.useMemo(
    () => Array.from(new Set(entries.map((e) => e.expenseType))).sort(),
    [entries],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (company !== ALL && e.company !== company) return false;
      if (type !== ALL && e.expenseType !== type) return false;
      if (!q) return true;
      return (
        e.vendor.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q) ||
        e.expenseType.toLowerCase().includes(q) ||
        e.account.toLowerCase().includes(q)
      );
    });
  }, [entries, search, company, type]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const showStatus = entries.some((e) => e.status);

  return (
    <Dialog open={!!config} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{config?.title}</DialogTitle>
          {config?.description && <p className="mt-1 text-sm text-hp-muted">{config.description}</p>}
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hp-muted" />
            <Input
              placeholder="Search vendor, account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7"
            />
          </div>
          {companies.length > 1 && (
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All companies</SelectItem>
                {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {types.length > 1 && (
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto border border-hp-rule">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-hp-card">
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>{config?.dateLabel ?? "Date"}</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-hp-muted">No matching items</TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-hp-inset"
                    onClick={() => onOpenEntry(entry)}
                  >
                    <TableCell>
                      <div className="flex max-w-[220px] items-center gap-2">
                        {showStatus && entry.status && (
                          <span className={`shrink-0 uppercase tracking-eyebrow text-[10px] ${DRILL_STATUS_BADGE[entry.status].className}`}>
                            {DRILL_STATUS_BADGE[entry.status].label}
                          </span>
                        )}
                        <span className="min-w-0 truncate text-hp-ink" title={entry.vendor}>{entry.vendor}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-hp-muted"><div className="max-w-[140px] truncate" title={entry.company}>{entry.company}</div></TableCell>
                    <TableCell className="text-hp-muted"><div className="max-w-[130px] truncate" title={entry.expenseType}>{entry.expenseType}</div></TableCell>
                    <TableCell className="text-hp-muted"><div className="max-w-[150px] truncate" title={entry.account}>{entry.account}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-hp-muted">{entry.date ? format(entry.date, "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-hp-ink">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-hp-muted"><ChevronRight className="h-4 w-4" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hp-rule pt-3 text-sm">
          <span className="text-hp-muted">
            {filtered.length} of {entries.length} item{entries.length === 1 ? "" : "s"}
          </span>
          <span className="font-title text-[20px] leading-none tabular-nums text-hp-ink">{formatCurrency(total)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
