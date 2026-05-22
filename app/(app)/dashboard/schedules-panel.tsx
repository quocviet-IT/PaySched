"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, DollarSign, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CsvImportDialog } from "./csv-import-dialog";
import { ScheduleCalendar } from "./schedule-calendar";
import type {
  PaymentSchedule, InternalCompany, PaymentAccount, PaymentType, ExpenseType, Vendor,
} from "@shared/schema";

const FREQUENCIES = [
  { value: "one-time", label: "One-time" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const PAYMENT_METHODS = [
  "credit-card", "debit-card", "bank-transfer", "cash", "paypal", "ach", "wire", "other",
];

function statusOf(s: PaymentSchedule): "paid" | "overdue" | "due-soon" | "scheduled" {
  if (s.status === "completed") return "paid";
  const d = new Date(s.nextDueDate);
  const diff = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "due-soon";
  return "scheduled";
}

function statusLabel(s: PaymentSchedule): string {
  const st = statusOf(s);
  if (st === "paid") return "Completed";
  const d = new Date(s.nextDueDate);
  const diff = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
  if (diff <= 7) return `Due in ${diff}d`;
  return `In ${diff}d`;
}

export function SchedulesPanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState("all");
  const [frequencyFilter, setFrequencyFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [editing, setEditing] = React.useState<PaymentSchedule | null>(null);
  const [open, setOpen] = React.useState(false);
  const [recordTarget, setRecordTarget] = React.useState<PaymentSchedule | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });
  const { data: companies = [] } = useQuery<InternalCompany[]>({ queryKey: ["/api/internal-companies"] });
  const { data: accounts = [] } = useQuery<PaymentAccount[]>({ queryKey: ["/api/payment-accounts"] });
  const { data: paymentTypes = [] } = useQuery<PaymentType[]>({ queryKey: ["/api/payment-types"] });
  const { data: expenseTypes = [] } = useQuery<ExpenseType[]>({ queryKey: ["/api/expense-types"] });
  const { data: vendors = [] } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const cName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/payment-schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Schedule deleted" });
    },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.vendorName.toLowerCase().includes(q) ||
      s.expenseId.toLowerCase().includes(q) ||
      cName(s.internalCompanyId).toLowerCase().includes(q);
    const st = statusOf(s);
    const matchTab = tab === "all"
      || (tab === "due-soon" && st === "due-soon")
      || (tab === "overdue" && st === "overdue")
      || (tab === "recurring" && ["bi-weekly", "monthly", "quarterly", "yearly"].includes(s.frequency));
    const matchFrequency = frequencyFilter === "all" || s.frequency === frequencyFilter;
    const matchStatus = statusFilter === "all" || st === statusFilter;
    return matchSearch && matchTab && matchFrequency && matchStatus;
  });

  // Reset to page 1 when filter changes so we don't land on an empty page.
  React.useEffect(() => { setPage(1); }, [search, tab, frequencyFilter, statusFilter, pageSize]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Payment Schedules</CardTitle>
          <p className="text-sm text-hp-muted">Manage vendors and recurring payment schedules.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-hp-muted" />
            <Input
              className="pl-7 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor, company…"
            />
          </div>
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frequencies</SelectItem>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="due-soon">Due soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <CsvImportDialog />
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />Add Schedule
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="due-soon">Due soon</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            {tab === "calendar" ? (
              <ScheduleCalendar
                schedules={schedules}
                onRecordPayment={(s) => setRecordTarget(s)}
              />
            ) : (
              <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((s) => {
                  const st = statusOf(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-hp-ink">{s.vendorName}</div>
                        <div className="text-[11px] uppercase tracking-eyebrow text-hp-muted mt-0.5">{s.expenseId}</div>
                      </TableCell>
                      <TableCell>{cName(s.internalCompanyId)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(Number(s.amount))}</TableCell>
                      <TableCell className="uppercase tracking-eyebrow text-[11px] text-hp-muted">{s.frequency}</TableCell>
                      <TableCell>{formatDate(s.nextDueDate)}</TableCell>
                      <TableCell>
                        <span className={`uppercase tracking-eyebrow text-[11px] ${
                          st === "overdue" ? "text-hp-pink" :
                          st === "due-soon" ? "text-hp-ink" :
                          st === "paid" ? "text-hp-muted" : "text-hp-body"
                        }`}>
                          {statusLabel(s)}
                        </span>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="Record payment"
                          onClick={() => setRecordTarget(s)}>
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Edit"
                          onClick={() => { setEditing(s); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <ConfirmDeleteButton
                            entityLabel="schedule"
                            name={s.vendorName}
                            onConfirm={() => del.mutate(s.id)}
                            pending={del.isPending && del.variables === s.id}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-hp-muted">
                      No schedules yet — click Add Schedule to get started.
                    </TableCell>
                  </TableRow>
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <ScheduleDialog
        open={open}
        editing={editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        companies={companies}
        accounts={accounts}
        paymentTypes={paymentTypes}
        expenseTypes={expenseTypes}
        vendors={vendors}
      />

      <RecordPaymentDialog
        target={recordTarget}
        onClose={() => setRecordTarget(null)}
        accounts={accounts}
      />
    </Card>
  );
}

// ============ Add / Edit Schedule ============
function ScheduleDialog({
  open, editing, onClose, companies, accounts, paymentTypes, expenseTypes, vendors,
}: {
  open: boolean;
  editing: PaymentSchedule | null;
  onClose: () => void;
  companies: InternalCompany[];
  accounts: PaymentAccount[];
  paymentTypes: PaymentType[];
  expenseTypes: ExpenseType[];
  vendors: Vendor[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    vendorName: "", vendorAbbreviation: "", amount: "", frequency: "monthly",
    nextDueDate: "", internalCompanyId: "", paymentTypeId: "", paymentAccountId: "", expenseTypeId: "",
  });

  React.useEffect(() => {
    if (editing) {
      setForm({
        vendorName: editing.vendorName,
        vendorAbbreviation: editing.vendorAbbreviation,
        amount: String(editing.amount),
        frequency: editing.frequency,
        nextDueDate: new Date(editing.nextDueDate).toISOString().slice(0, 10),
        internalCompanyId: editing.internalCompanyId,
        paymentTypeId: editing.paymentTypeId,
        paymentAccountId: editing.paymentAccountId,
        expenseTypeId: editing.expenseTypeId,
      });
    } else if (open) {
      setForm({
        vendorName: "", vendorAbbreviation: "", amount: "", frequency: "monthly",
        nextDueDate: new Date().toISOString().slice(0, 10),
        internalCompanyId: "", paymentTypeId: "", paymentAccountId: "", expenseTypeId: "",
      });
    }
  }, [editing, open]);

  const save = useMutation({
    mutationFn: (body: any) => editing
      ? apiRequest("PATCH", `/api/payment-schedules/${editing.id}`, body)
      : apiRequest("POST", "/api/payment-schedules", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: editing ? "Schedule updated" : "Schedule added" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.vendorName) missing.push("Vendor");
    if (!form.internalCompanyId) missing.push("Internal Company");
    if (!form.paymentTypeId) missing.push("Payment Type");
    if (!form.paymentAccountId) missing.push("Payment Account");
    if (!form.expenseTypeId) missing.push("Expense Type");
    if (missing.length) {
      toast({
        title: "Please fill in all required fields",
        description: missing.join(", "),
        variant: "destructive",
      });
      return;
    }
    save.mutate({
      ...form,
      amount: Number(form.amount),
      nextDueDate: new Date(form.nextDueDate),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Schedule</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="sched-vendor">Vendor Name</Label>
            <Select
              value={form.vendorName}
              onValueChange={(v) => {
                const picked = vendors.find((x) => x.name === v);
                setForm({
                  ...form,
                  vendorName: v,
                  vendorAbbreviation: picked?.abbreviation ?? "",
                });
              }}
            >
              <SelectTrigger id="sched-vendor"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-hp-muted">
                    No vendors yet — add one in Settings.
                  </div>
                ) : (
                  vendors.map((v) => (
                    <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-vabbr">Vendor Abbreviation</Label>
            <Input id="sched-vabbr" readOnly value={form.vendorAbbreviation}
              placeholder="VENDOR" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-amount">Amount</Label>
            <Input id="sched-amount" required type="number" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-freq">Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
              <SelectTrigger id="sched-freq"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-date">Next Due Date</Label>
            <Input id="sched-date" required type="date" value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-company">Internal Company</Label>
            <Select value={form.internalCompanyId} onValueChange={(v) => setForm({ ...form, internalCompanyId: v })}>
              <SelectTrigger id="sched-company"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-paytype">Payment Type</Label>
            <Select value={form.paymentTypeId} onValueChange={(v) => setForm({ ...form, paymentTypeId: v })}>
              <SelectTrigger id="sched-paytype"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {paymentTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-acc">Payment Account</Label>
            <Select value={form.paymentAccountId} onValueChange={(v) => setForm({ ...form, paymentAccountId: v })}>
              <SelectTrigger id="sched-acc"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sched-exptype">Expense Type</Label>
            <Select value={form.expenseTypeId} onValueChange={(v) => setForm({ ...form, expenseTypeId: v })}>
              <SelectTrigger id="sched-exptype"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {expenseTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : (editing ? "Update" : "Add Schedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Record Payment ============
function RecordPaymentDialog({
  target, onClose, accounts,
}: {
  target: PaymentSchedule | null;
  onClose: () => void;
  accounts: PaymentAccount[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "bank-transfer",
    paymentAccountId: "",
    approvedBy: "",
  });
  const [confirmationFile, setConfirmationFile] = React.useState<File | null>(null);
  const [approvalScreenshot, setApprovalScreenshot] = React.useState<File | null>(null);

  const { data: approvers = [] } = useQuery<{ id: string; username: string }[]>({
    queryKey: ["/api/users/approvers"],
  });

  React.useEffect(() => {
    if (target) {
      setForm({
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: String(target.amount),
        paymentMethod: "bank-transfer",
        paymentAccountId: target.paymentAccountId,
        approvedBy: "",
      });
      setConfirmationFile(null);
      setApprovalScreenshot(null);
    }
  }, [target]);

  const record = useMutation({
    mutationFn: async (body: any) => {
      // Upload files first (if any), then create record with returned paths.
      const upload = async (f: File | null) => {
        if (!f) return null;
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Upload failed");
        return (await res.json()).path as string;
      };
      const [confirmationPath, approvalPath] = await Promise.all([
        upload(confirmationFile),
        upload(approvalScreenshot),
      ]);
      return apiRequest("POST", "/api/payment-records", {
        ...body,
        confirmationFile: confirmationPath,
        approvalScreenshot: approvalPath,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      qc.invalidateQueries({ queryKey: ["/api/payment-records"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payment recorded" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (!target) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    record.mutate({
      paymentScheduleId: target.id,
      paymentDate: new Date(form.paymentDate),
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      paymentAccountId: form.paymentAccountId || null,
      approvedBy: form.approvedBy || null,
    });
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <p className="text-sm text-hp-muted mt-1">
            {target.vendorName} · {formatCurrency(Number(target.amount))} · {target.frequency}
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-date">Payment Date</Label>
              <Input id="rec-date" required type="date" value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input id="rec-amount" required type="number" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-method">Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger id="rec-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-acc">Payment Account</Label>
              <Select value={form.paymentAccountId} onValueChange={(v) => setForm({ ...form, paymentAccountId: v })}>
                <SelectTrigger id="rec-acc"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-approver">Approved By (optional)</Label>
            <Select value={form.approvedBy} onValueChange={(v) => setForm({ ...form, approvedBy: v })}>
              <SelectTrigger id="rec-approver"><SelectValue placeholder="Select approver" /></SelectTrigger>
              <SelectContent>
                {approvers.map((u) => <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <FileField
            id="rec-confirm"
            label="Confirmation file (optional)"
            file={confirmationFile}
            onChange={setConfirmationFile}
          />
          <FileField
            id="rec-approval"
            label="Approval screenshot (optional)"
            file={approvalScreenshot}
            onChange={setApprovalScreenshot}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FileField({
  id, label, file, onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="file"
          aria-label={label}
          title={label}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-hp-body file:mr-3 file:border file:border-hp-ink file:bg-transparent file:text-hp-ink file:uppercase file:tracking-eyebrow file:text-[11px] file:px-3 file:py-1.5 file:rounded-sm hover:file:bg-hp-ink hover:file:text-hp-foundation file:cursor-pointer cursor-pointer"
        />
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="uppercase tracking-eyebrow text-[11px] text-hp-muted hover:text-hp-pink"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
