"use client";

import type { ReactNode } from "react";
import { Receipt, FileCheck2, AlertTriangle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DrillStatus, DRILL_STATUS_BADGE } from "./drill-down-dialog";

export interface DetailField {
  label: string;
  value: ReactNode;
}

export interface DetailHistoryItem {
  id: string;
  date: string;
  amount: string;
  method: string;
  account?: string;
  daysLate?: number;
  hasConfirmation?: boolean;
}

export interface ExpenseDetailData {
  vendor: string;
  expenseId: string;
  status?: DrillStatus;
  /** Underlying schedule id; enables the Edit action. */
  scheduleId?: string;
  /** False when the schedule has been cancelled. */
  active?: boolean;
  fields: DetailField[];
  history: DetailHistoryItem[];
  /** Record id to visually highlight within the history table. */
  highlightId?: string;
}

export function ExpenseDetailDialog({
  data,
  onOpenChange,
  onEdit,
}: {
  data: ExpenseDetailData | null;
  onOpenChange: (open: boolean) => void;
  /** Called with the schedule id when the user clicks Edit. */
  onEdit?: (scheduleId: string) => void;
}) {
  const inactive = data?.active === false;
  return (
    <Dialog open={!!data} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>{data?.vendor}</DialogTitle>
            {inactive ? (
              <span className="uppercase tracking-eyebrow text-[10px] text-hp-muted">Inactive</span>
            ) : (
              data?.status && (
                <span className={`uppercase tracking-eyebrow text-[10px] ${DRILL_STATUS_BADGE[data.status].className}`}>
                  {DRILL_STATUS_BADGE[data.status].label}
                </span>
              )
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-hp-muted">{data?.expenseId}</p>
        </DialogHeader>

        {data && (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            {/* Field grid */}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {data.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[11px] uppercase tracking-eyebrow text-hp-muted">{field.label}</dt>
                  <dd className="mt-0.5 text-sm text-hp-ink">{field.value}</dd>
                </div>
              ))}
            </dl>

            {/* Payment history */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-hp-pink" />
                <span className="eyebrow">Payment history</span>
                <span className="text-xs text-hp-muted">
                  {data.history.length} payment{data.history.length === 1 ? "" : "s"}
                </span>
              </div>
              {data.history.length === 0 ? (
                <div className="border border-dashed border-hp-rule py-8 text-center text-sm text-hp-muted">
                  No payments recorded yet
                </div>
              ) : (
                <div className="overflow-hidden border border-hp-rule">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.history.map((item) => (
                        <TableRow key={item.id} className={item.id === data.highlightId ? "bg-hp-inset" : undefined}>
                          <TableCell className="whitespace-nowrap text-hp-body">{item.date}</TableCell>
                          <TableCell className="capitalize text-hp-muted">{item.method}</TableCell>
                          <TableCell className="text-hp-muted">{item.account ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums text-hp-ink">{item.amount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.daysLate && item.daysLate > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs text-hp-pink">
                                  <AlertTriangle className="h-3 w-3" />
                                  {item.daysLate}d late
                                </span>
                              ) : (
                                <span className="text-xs text-hp-muted">On time</span>
                              )}
                              {item.hasConfirmation && <FileCheck2 className="h-3.5 w-3.5 text-hp-muted" />}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {data?.scheduleId && onEdit && (
          <DialogFooter className="border-t border-hp-rule pt-3">
            <Button variant="secondary" onClick={() => onEdit(data.scheduleId!)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit schedule
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
