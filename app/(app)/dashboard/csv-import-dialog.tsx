"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { similarity } from "@/lib/fuzzy";
import { formatCurrency } from "@/lib/utils";
import type {
  PaymentSchedule, PaymentAccount, AccountMapping,
} from "@shared/schema";

interface ParsedRow {
  raw: Record<string, string>;
  vendor: string;
  amount: number;
  date: string;
  csvAccountName: string;
  scheduleId: string;
  paymentAccountId: string;
}

/** Tiny CSV parser supporting quoted fields and commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || row.length) { row.push(field); rows.push(row); }
        row = []; field = "";
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

function parseAmount(s: string): number {
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(s: string): string {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function CsvImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedRow[]>([]);

  const { data: schedules = [] } = useQuery<PaymentSchedule[]>({ queryKey: ["/api/payment-schedules"] });
  const { data: accounts = [] } = useQuery<PaymentAccount[]>({ queryKey: ["/api/payment-accounts"] });
  const { data: mappings = [] } = useQuery<AccountMapping[]>({ queryKey: ["/api/account-mappings"] });

  const onFile = (file: File | null) => {
    if (!file) { setParsed([]); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseCsv(text);
      if (rows.length < 2) { toast({ title: "CSV is empty", variant: "destructive" }); return; }
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const vendorIdx = headers.findIndex((h) => /vendor|description|payee|name/i.test(h));
      const amountIdx = headers.findIndex((h) => /amount|value|debit/i.test(h));
      const dateIdx = headers.findIndex((h) => /date|paid/i.test(h));
      const accountIdx = headers.findIndex((h) => /account/i.test(h));

      const items: ParsedRow[] = rows.slice(1).map((r) => {
        const csvAccountName = accountIdx >= 0 ? r[accountIdx] ?? "" : "";
        const vendor = vendorIdx >= 0 ? r[vendorIdx] ?? "" : "";

        // Suggest schedule via Levenshtein on vendor name.
        let bestSchedule: PaymentSchedule | null = null;
        let bestScore = 0;
        for (const s of schedules) {
          const sc = similarity(vendor, s.vendorName);
          if (sc > bestScore) { bestScore = sc; bestSchedule = s; }
        }

        // Suggest payment account via existing CSV mapping.
        const mapping = mappings.find((m) => m.csvAccountName.toLowerCase() === csvAccountName.toLowerCase());

        return {
          raw: Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])),
          vendor,
          amount: amountIdx >= 0 ? parseAmount(r[amountIdx] ?? "") : 0,
          date: dateIdx >= 0 ? parseDate(r[dateIdx] ?? "") : new Date().toISOString().slice(0, 10),
          csvAccountName,
          scheduleId: bestScore > 0.6 ? bestSchedule?.id ?? "" : "",
          paymentAccountId: mapping?.paymentAccountId ?? "",
        };
      });
      setParsed(items);
    };
    reader.readAsText(file);
  };

  const commit = useMutation({
    mutationFn: (items: ParsedRow[]) =>
      apiRequest("POST", "/api/payment-records/bulk", items
        .filter((it) => it.scheduleId)
        .map((it) => ({
          paymentScheduleId: it.scheduleId,
          paymentDate: new Date(it.date).toISOString(),
          amount: it.amount,
          paymentMethod: "other",
          paymentAccountId: it.paymentAccountId || null,
        }))),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["/api/payment-records"] });
      qc.invalidateQueries({ queryKey: ["/api/payment-schedules"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const count = Array.isArray(created) ? created.length : 0;
      toast({ title: `Imported ${count} payment${count === 1 ? "" : "s"}` });
      setParsed([]);
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const ready = parsed.filter((p) => p.scheduleId).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setParsed([]); }}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Upload className="h-3.5 w-3.5" />Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import payments from CSV</DialogTitle>
          <p className="text-sm text-hp-muted mt-1">
            Upload a CSV with columns for vendor, amount, date, and (optionally) account.
            Vendor names are matched to schedules using fuzzy matching.
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV file</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              aria-label="CSV file"
              title="CSV file"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-hp-body file:mr-3 file:border file:border-hp-ink file:bg-transparent file:text-hp-ink file:uppercase file:tracking-eyebrow file:text-[11px] file:px-3 file:py-1.5 file:rounded-sm hover:file:bg-hp-ink hover:file:text-hp-foundation file:cursor-pointer cursor-pointer"
            />
          </div>

          {parsed.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-eyebrow text-hp-muted">
                {parsed.length} rows parsed · {ready} ready to import
              </p>
              <div className="max-h-96 overflow-auto border border-hp-rule">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Matched schedule</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="text-hp-ink">{it.vendor || <span className="text-hp-muted">—</span>}</div>
                          {it.csvAccountName && (
                            <div className="text-[11px] uppercase tracking-eyebrow text-hp-muted mt-0.5">
                              {it.csvAccountName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(it.amount)}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={it.date}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParsed((arr) => arr.map((x, j) => j === i ? { ...x, date: v } : x));
                            }}
                            className="w-36"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={it.scheduleId}
                            onValueChange={(v) => setParsed((arr) => arr.map((x, j) => j === i ? { ...x, scheduleId: v } : x))}
                          >
                            <SelectTrigger className="w-48"><SelectValue placeholder="Skip" /></SelectTrigger>
                            <SelectContent>
                              {schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.vendorName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={it.paymentAccountId}
                            onValueChange={(v) => setParsed((arr) => arr.map((x, j) => j === i ? { ...x, paymentAccountId: v } : x))}
                          >
                            <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon" variant="ghost" aria-label="Remove"
                            onClick={() => setParsed((arr) => arr.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => { setOpen(false); setParsed([]); }}>Cancel</Button>
            <Button
              disabled={commit.isPending || ready === 0}
              onClick={() => commit.mutate(parsed)}
            >
              {commit.isPending ? "Importing…" : `Import ${ready} payment${ready === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
