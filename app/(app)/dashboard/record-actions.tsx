"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { PaymentRecord } from "@shared/schema";

export function ManageFilesButton({ record }: { record: PaymentRecord }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="icon" variant="ghost" aria-label="Manage files" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" />
      </Button>
      {open && <ManageFilesDialog record={record} onClose={() => setOpen(false)} />}
    </>
  );
}

function ManageFilesDialog({ record, onClose }: { record: PaymentRecord; onClose: () => void }) {
  const qc = useQueryClient();
  const [confirmation, setConfirmation] = React.useState<File | null>(null);
  const [approval, setApproval] = React.useState<File | null>(null);
  const [reason, setReason] = React.useState("");

  const upload = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("reason", reason.trim());
      if (confirmation) fd.append("confirmationFile", confirmation);
      if (approval) fd.append("approvalScreenshot", approval);
      const res = await fetch(`/api/payment-records/${record.id}/files`, {
        method: "PUT", body: fd, credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-records"] });
      toast({ title: "Files updated" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage attached files</DialogTitle></DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) { toast({ title: "Reason is required", variant: "destructive" }); return; }
            if (!confirmation && !approval) { toast({ title: "Select at least one file to upload", variant: "destructive" }); return; }
            upload.mutate();
          }}
        >
          <FileSlot label="Confirmation file" current={record.confirmationFile} onChange={setConfirmation} />
          <FileSlot label="Approval screenshot" current={record.approvalScreenshot} onChange={setApproval} />
          <div className="space-y-2">
            <Label htmlFor="files-reason">Reason for change</Label>
            <textarea
              id="files-reason" required value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you updating these files?" rows={3}
              className="w-full bg-transparent border-0 border-b border-hp-rule px-0.5 py-1.5 font-body text-base text-hp-body focus:outline-none focus:border-b-2 focus:border-hp-pink transition-colors"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({
  label, current, onChange,
}: { label: string; current: string | null; onChange: (f: File | null) => void }) {
  const [signed, setSigned] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const view = async () => {
    if (!current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/files/sign?path=${encodeURIComponent(current)}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.url) {
        setSigned(data.url);
        window.open(data.url, "_blank", "noopener");
      } else {
        toast({ title: "Cannot generate link", description: data.message, variant: "destructive" });
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {current ? (
        <div className="flex items-center gap-3 text-sm text-hp-body">
          <span className="font-mono text-xs truncate flex-1">{current}</span>
          <button
            type="button" onClick={view} disabled={loading}
            className="uppercase tracking-eyebrow text-[11px] text-hp-ink hover:text-hp-pink disabled:opacity-40"
          >
            {loading ? "Opening…" : (signed ? "Re-open" : "View")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-hp-muted">No file attached.</p>
      )}
      <input
        type="file"
        aria-label={`Upload new ${label}`}
        title={`Upload new ${label}`}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-hp-body file:mr-3 file:border file:border-hp-ink file:bg-transparent file:text-hp-ink file:uppercase file:tracking-eyebrow file:text-[11px] file:px-3 file:py-1.5 file:rounded-sm hover:file:bg-hp-ink hover:file:text-hp-foundation file:cursor-pointer cursor-pointer"
      />
    </div>
  );
}

// ============ Audit History ============
interface RecordAudit {
  id: string;
  paymentRecordId: string;
  action: string;
  reason: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  performedBy: string;
  createdAt: string;
}

export function AuditHistoryButton({ recordId }: { recordId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="icon" variant="ghost" aria-label="History" onClick={() => setOpen(true)}>
        <History className="h-3.5 w-3.5" />
      </Button>
      {open && <AuditHistoryDialog recordId={recordId} onClose={() => setOpen(false)} />}
    </>
  );
}

function AuditHistoryDialog({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { data = [], isLoading } = useQuery<RecordAudit[]>({
    queryKey: [`/api/payment-record-audits?recordId=${recordId}`],
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change history</DialogTitle>
          <p className="text-sm text-hp-muted mt-1">All edits and deletions for this payment record.</p>
        </DialogHeader>
        {isLoading ? (
          <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-hp-muted">No changes yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="tabular-nums text-xs text-hp-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`uppercase tracking-eyebrow text-[11px] ${
                      a.action === "delete" ? "text-hp-pink" : "text-hp-ink"
                    }`}>{a.action}</span>
                  </TableCell>
                  <TableCell className="text-sm">{a.reason}</TableCell>
                  <TableCell className="font-mono text-xs text-hp-muted">{a.performedBy.slice(0, 8)}…</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
