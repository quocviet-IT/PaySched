"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ManageFilesButton, AuditHistoryButton } from "./record-actions";
import type { PaymentRecord, PaymentSchedule } from "@shared/schema";

export function HistoryPanel({ isAdmin, sessionUserId }: { isAdmin: boolean; sessionUserId: string }) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [editing, setEditing] = React.useState<PaymentRecord | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const { data: records = [] } = useQuery<PaymentRecord[]>({ queryKey: ["/api/payment-records"] });
  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });

  const filtered = records.filter((r) => {
    const d = new Date(r.paymentDate);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    return true;
  });

  const vendorOf = (r: PaymentRecord) => {
    const s = schedules.find((x) => x.id === r.paymentScheduleId)
      ?? schedules.find((x) => x.expenseId === r.expenseId);
    return s?.vendorName ?? r.expenseId;
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Payment History</CardTitle>
          <p className="text-sm text-hp-muted">All recorded payments.</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="hist-from">From</Label>
            <Input id="hist-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hist-to">To</Label>
            <Input id="hist-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Days Late</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const canEdit = isAdmin || r.paidBy === sessionUserId;
              return (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{formatDate(r.paymentDate)}</TableCell>
                  <TableCell>{vendorOf(r)}</TableCell>
                  <TableCell className="tabular-nums text-hp-ink">{formatCurrency(Number(r.amount))}</TableCell>
                  <TableCell className="uppercase tracking-eyebrow text-[11px] text-hp-muted">{r.paymentMethod}</TableCell>
                  <TableCell className={r.daysLate > 0 ? "text-hp-pink tabular-nums" : "text-hp-muted tabular-nums"}>
                    {r.daysLate > 0 ? `${r.daysLate}d` : "—"}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <ManageFilesButton record={r} />
                    <AuditHistoryButton recordId={r.id} />
                    {canEdit && (
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeletingId(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-hp-muted">
                No payments recorded yet.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <RecordEditDialog record={editing} onClose={() => setEditing(null)} />
      <RecordDeleteDialog id={deletingId} onClose={() => setDeletingId(null)} />
    </Card>
  );
}

function RecordEditDialog({ record, onClose }: { record: PaymentRecord | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (record) {
      setAmount(String(record.amount));
      setPaymentDate(new Date(record.paymentDate).toISOString().slice(0, 10));
      setReason("");
    }
  }, [record]);

  const save = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/payment-records/${record!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-records"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Record updated" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  if (!record) return null;

  return (
    <Dialog open={!!record} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Payment Record</DialogTitle></DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) {
              toast({ title: "Reason is required", variant: "destructive" });
              return;
            }
            save.mutate({
              amount: Number(amount),
              paymentDate: new Date(paymentDate).toISOString(),
              reason: reason.trim(),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="er-amount">Amount</Label>
            <Input id="er-amount" required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="er-date">Payment Date</Label>
            <Input id="er-date" required type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="er-reason">Reason for change</Label>
            <textarea
              id="er-reason" required value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Required — explain why you are editing" rows={3}
              className="w-full bg-transparent border-0 border-b border-hp-rule px-0.5 py-1.5 font-body text-base text-hp-body focus:outline-none focus:border-b-2 focus:border-hp-pink transition-colors"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordDeleteDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = React.useState("");
  React.useEffect(() => { if (id) setReason(""); }, [id]);

  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/payment-records/${id}`, { reason: reason.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-records"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Record deleted" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  if (!id) return null;

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Payment</DialogTitle>
          <p className="text-sm text-hp-muted mt-1">This action cannot be undone.</p>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) {
              toast({ title: "Reason is required", variant: "destructive" });
              return;
            }
            del.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="del-reason">Reason for deletion</Label>
            <textarea
              id="del-reason" required value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Required" rows={3}
              className="w-full bg-transparent border-0 border-b border-hp-rule px-0.5 py-1.5 font-body text-base text-hp-body focus:outline-none focus:border-b-2 focus:border-hp-pink transition-colors"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={del.isPending}>
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
