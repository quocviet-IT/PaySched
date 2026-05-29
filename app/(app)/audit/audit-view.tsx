"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
  performedByName: string | null;
  createdAt: string;
}

interface UserRow {
  id: string;
  username: string;
}

interface Filters {
  from: string;
  to: string;
  userId: string;
}

const EMPTY_FILTERS: Filters = { from: "", to: "", userId: "" };
const ALL_USERS = "__all__";

function buildUrl(base: string, f: Filters): string {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.userId) p.set("userId", f.userId);
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function AuditView() {
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const { data: users = [] } = useQuery<UserRow[]>({ queryKey: ["/api/users"] });

  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Activity</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Audit Log</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <AuditFilters filters={filters} onChange={setFilters} users={users} />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General activity</TabsTrigger>
          <TabsTrigger value="records">Record changes</TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralAudit filters={filters} /></TabsContent>
        <TabsContent value="records"><RecordsAudit filters={filters} /></TabsContent>
      </Tabs>
    </div>
  );
}

function AuditFilters({
  filters,
  onChange,
  users,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  users: UserRow[];
}) {
  const hasFilters = Boolean(filters.from || filters.to || filters.userId);
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <label className="flex flex-col gap-1">
        <span className="uppercase tracking-eyebrow text-[11px] text-hp-muted">From</span>
        <Input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className="w-[160px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="uppercase tracking-eyebrow text-[11px] text-hp-muted">To</span>
        <Input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className="w-[160px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="uppercase tracking-eyebrow text-[11px] text-hp-muted">User</span>
        <Select
          value={filters.userId || ALL_USERS}
          onValueChange={(v) => onChange({ ...filters, userId: v === ALL_USERS ? "" : v })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_USERS}>All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {hasFilters && (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

function GeneralAudit({ filters }: { filters: Filters }) {
  const url = buildUrl("/api/audit", filters);
  const { data = [], isLoading } = useQuery<AuditLogRow[]>({ queryKey: [url] });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => { setPage(1); }, [pageSize, data.length, url]);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Card>
      <CardHeader><CardTitle>500 most recent events</CardTitle></CardHeader>
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

function RecordsAudit({ filters }: { filters: Filters }) {
  const url = buildUrl("/api/payment-record-audits", filters);
  const { data = [], isLoading } = useQuery<RecordAudit[]>({ queryKey: [url] });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => { setPage(1); }, [pageSize, data.length, url]);
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
                  <TableCell className="text-xs text-hp-muted">
                    {r.performedByName ?? `${r.performedBy.slice(0, 8)}…`}
                  </TableCell>
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
