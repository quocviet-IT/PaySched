"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { SchedulesPanel } from "./schedules-panel";
import { HistoryPanel } from "./history-panel";

interface DashboardStats {
  scheduled: number;
  dueSoon: number;
  overdue: number;
  paidThisMonth: number;
  paidThisMonthCount: number;
}

export function DashboardView({ isAdmin, sessionUserId }: { isAdmin: boolean; sessionUserId: string }) {
  const { data: stats } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });

  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Tổng quan</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Dashboard</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <div className="grid grid-cols-1 gap-px bg-hp-rule md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lịch chờ thanh toán" value={stats?.scheduled ?? 0} />
        <StatCard label="Đến hạn trong 7 ngày" value={stats?.dueSoon ?? 0} />
        <StatCard label="Quá hạn" value={stats?.overdue ?? 0} accent={(stats?.overdue ?? 0) > 0} />
        <StatCard
          label="Đã thanh toán tháng này"
          value={formatCurrency(stats?.paidThisMonth ?? 0)}
          sub={`${stats?.paidThisMonthCount ?? 0} giao dịch`}
        />
      </div>

      <SchedulesPanel isAdmin={isAdmin} />
      <HistoryPanel isAdmin={isAdmin} sessionUserId={sessionUserId} />
    </div>
  );
}

function StatCard({
  label, value, sub, accent,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-hp-card p-7">
      <span className="eyebrow mb-3">{label}</span>
      <div className={`mt-2 font-title text-[36px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>
        {value}
      </div>
      {sub && <div className="mt-3 text-[11px] uppercase tracking-eyebrow text-hp-muted">{sub}</div>}
    </div>
  );
}
