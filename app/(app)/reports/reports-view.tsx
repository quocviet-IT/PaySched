"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type IssueType = "overdue" | "late" | "underpaid" | "overpaid";
interface Issue {
  type: IssueType;
  vendorName: string;
  companyName: string | null;
  detail: string;
}

interface ReportsData {
  byMonth: { month: string; total: number; count: number }[];
  byCompany: { company: string; total: number }[];
  byExpense: { expenseType: string; total: number }[];
  issues: Issue[];
}

export function ReportsView() {
  const { data, isLoading } = useQuery<ReportsData>({ queryKey: ["/api/reports"] });

  const issues = data?.issues ?? [];

  const totalAll = (data?.byMonth ?? []).reduce((s, r) => s + r.total, 0);
  const totalCount = (data?.byMonth ?? []).reduce((s, r) => s + r.count, 0);
  const avgPerTx = totalCount > 0 ? totalAll / totalCount : 0;

  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Analytics</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Reports</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <div className="grid grid-cols-1 gap-px bg-hp-rule md:grid-cols-4">
        <Stat label="Total paid" value={formatCurrency(totalAll)} />
        <Stat label="Payments" value={String(totalCount)} />
        <Stat label="Average per payment" value={formatCurrency(avgPerTx)} />
        <Stat
          label="Open issues"
          value={String(issues.length)}
          accent={issues.length > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open issues</CardTitle>
          <p className="text-sm text-hp-muted">Schedules that need attention — overdue, late, or amount mismatches.</p>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <p className="py-6 text-center text-sm text-hp-muted">All schedules look healthy.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((iss, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className={`uppercase tracking-eyebrow text-[11px] ${
                        iss.type === "overdue" ? "text-hp-pink" :
                        iss.type === "late" ? "text-hp-ink" : "text-hp-body"
                      }`}>
                        {iss.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-hp-ink">{iss.vendorName}</TableCell>
                    <TableCell>{iss.companyName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-hp-body">{iss.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by month</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
          ) : (data?.byMonth?.length ?? 0) === 0 ? (
            <Empty body="No data yet — record your first payment to see the chart." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byMonth ?? []}>
                  <CartesianGrid stroke="var(--rule)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--ink-muted)"
                    style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em" }}
                  />
                  <YAxis
                    stroke="var(--ink-muted)"
                    style={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--rule)",
                      borderRadius: 0,
                      fontFamily: "var(--font-body), Cardo, serif",
                    }}
                    cursor={{ fill: "var(--surface-inset)" }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="total" fill="var(--ink-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Spending by company</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.byCompany ?? []).length === 0 ? (
              <Empty body="No data yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byCompany ?? [])
                    .sort((a, b) => b.total - a.total)
                    .map((r) => (
                      <TableRow key={r.company}>
                        <TableCell>{r.company}</TableCell>
                        <TableCell className="text-right tabular-nums text-hp-ink">
                          {formatCurrency(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by expense type</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.byExpense ?? []).length === 0 ? (
              <Empty body="No data yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byExpense ?? [])
                    .sort((a, b) => b.total - a.total)
                    .map((r) => (
                      <TableRow key={r.expenseType}>
                        <TableCell>{r.expenseType}</TableCell>
                        <TableCell className="text-right tabular-nums text-hp-ink">
                          {formatCurrency(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-hp-card p-7">
      <span className="eyebrow mb-3">{label}</span>
      <div className={`mt-2 font-title text-[28px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Empty({ body }: { body: string }) {
  return <p className="py-8 text-center text-sm text-hp-muted">{body}</p>;
}
