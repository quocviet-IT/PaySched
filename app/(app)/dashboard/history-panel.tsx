"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil, FileSpreadsheet, FileDown, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ManageFilesButton, AuditHistoryButton } from "./record-actions";
import type { PaymentRecord, PaymentSchedule } from "@shared/schema";

export function HistoryPanel({ isAdmin, sessionUserId }: { isAdmin: boolean; sessionUserId: string }) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<PaymentRecord | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const { data: records = [] } = useQuery<PaymentRecord[]>({ queryKey: ["/api/payment-records"] });
  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });

  const filtered = records.filter((r) => {
    const d = new Date(r.paymentDate);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const s = schedules.find((x) => x.id === r.paymentScheduleId)
        ?? schedules.find((x) => x.expenseId === r.expenseId);
      const haystack = [
        s?.vendorName, r.expenseId,
        r.checkNumber, r.referenceNumber, r.memo,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Reset to page 1 whenever filter or page size changes so we don't land on an empty page.
  React.useEffect(() => { setPage(1); }, [from, to, search, pageSize]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const vendorOf = (r: PaymentRecord) => {
    const s = schedules.find((x) => x.id === r.paymentScheduleId)
      ?? schedules.find((x) => x.expenseId === r.expenseId);
    return s?.vendorName ?? r.expenseId;
  };

  const buildExportRows = () =>
    filtered.map((r) => [
      formatDate(r.paymentDate),
      vendorOf(r),
      `$${Number(r.amount).toFixed(2)}`,
      r.paymentMethod,
      r.checkNumber ?? "",
      r.referenceNumber ?? "",
      r.memo ?? "",
      r.daysLate > 0 ? `${r.daysLate}d` : "—",
    ]);

  const EXPORT_HEADERS = ["Date", "Vendor", "Amount", "Method", "Check #", "Reference #", "Memo", "Days Late"];

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to export", description: "No payments match the current filter." });
      return;
    }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [EXPORT_HEADERS, ...buildExportRows()].map((row) => row.map(escape).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded" });
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to export", description: "No payments match the current filter." });
      return;
    }
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable: any = (autoTableModule as any).default ?? autoTableModule;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

      doc.setFontSize(20);
      doc.text("Payment History", 40, 50);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated ${new Date().toLocaleString()}`, 40, 70);

      autoTable(doc, {
        head: [EXPORT_HEADERS],
        body: buildExportRows(),
        startY: 90,
        styles: { fontSize: 10, cellPadding: 6, lineColor: [225, 225, 225] },
        headStyles: { fillColor: [41, 70, 147], textColor: 255, fontSize: 11, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 2: { halign: "right" }, 7: { halign: "center" } },
      });

      doc.save(`payment-history-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "Failed to export PDF", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Payment History</CardTitle>
          <p className="text-sm text-hp-muted">All recorded payments.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end flex-wrap gap-3 w-full sm:w-auto">
          <div className="space-y-1 flex-1 sm:flex-none">
            <Label htmlFor="hist-search">Search</Label>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-hp-muted" />
              <Input
                id="hist-search"
                className="pl-7 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vendor, check #, reference, memo…"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label htmlFor="hist-from">From</Label>
              <Input id="hist-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label htmlFor="hist-to">To</Label>
              <Input id="hist-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-3.5 w-3.5" />Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void handleExportPDF()}>
              <FileDown className="h-3.5 w-3.5" />Export PDF
            </Button>
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
              <TableHead>Check #</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Days Late</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((r) => {
              const canEdit = isAdmin || r.paidBy === sessionUserId;
              return (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{formatDate(r.paymentDate)}</TableCell>
                  <TableCell>
                    <div className="text-hp-ink">{vendorOf(r)}</div>
                    {r.memo && (
                      <div className="text-[11px] text-hp-muted mt-0.5 truncate max-w-xs" title={r.memo}>
                        {r.memo}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-hp-ink">{formatCurrency(Number(r.amount))}</TableCell>
                  <TableCell className="uppercase tracking-eyebrow text-[11px] text-hp-muted">{r.paymentMethod}</TableCell>
                  <TableCell className="font-mono text-[12px] text-hp-body">{r.checkNumber || <span className="text-hp-muted">—</span>}</TableCell>
                  <TableCell className="font-mono text-[12px] text-hp-body truncate max-w-[140px]" title={r.referenceNumber ?? ""}>
                    {r.referenceNumber || <span className="text-hp-muted">—</span>}
                  </TableCell>
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
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-hp-muted">
                No payments recorded yet.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
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
