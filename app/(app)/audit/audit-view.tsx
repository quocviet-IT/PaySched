"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";

interface AuditLogRow {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

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

export function AuditView() {
  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Activity</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Audit Log</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General activity</TabsTrigger>
          <TabsTrigger value="records">Record changes</TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralAudit /></TabsContent>
        <TabsContent value="records"><RecordsAudit /></TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralAudit() {
  const { data = [], isLoading } = useQuery<AuditLogRow[]>({ queryKey: ["/api/audit"] });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => { setPage(1); }, [pageSize, data.length]);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Card>
      <CardHeader><CardTitle>200 most recent events</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-hp-muted">No activity yet.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums text-xs text-hp-muted">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{r.username ?? "—"}</TableCell>
                    <TableCell className="uppercase tracking-eyebrow text-[11px] text-hp-ink">{r.action}</TableCell>
                    <TableCell className="text-hp-muted">
                      {r.entityType ? `${r.entityType}${r.entityId ? `:${r.entityId.slice(0, 8)}…` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-hp-body">{r.details ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              total={data.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RecordsAudit() {
  const { data = [], isLoading } = useQuery<RecordAudit[]>({ queryKey: ["/api/payment-record-audits"] });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => { setPage(1); }, [pageSize, data.length]);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Card>
      <CardHeader><CardTitle>Payment record edits and deletions</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-hp-muted">No changes yet.</p>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums text-xs text-hp-muted">
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`uppercase tracking-eyebrow text-[11px] ${
                      r.action === "delete" ? "text-hp-pink" : "text-hp-ink"
                    }`}>
                      {r.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-hp-muted">{r.paymentRecordId.slice(0, 8)}…</TableCell>
                  <TableCell className="text-sm text-hp-body">{r.reason}</TableCell>
                  <TableCell className="font-mono text-xs text-hp-muted">{r.performedBy.slice(0, 8)}…</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            total={data.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </CardContent>
    </Card>
  );
}
