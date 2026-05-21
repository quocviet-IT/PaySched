"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock3, AlertCircle, DollarSign } from "lucide-react";
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
        <span className="eyebrow mb-2">Overview</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Dashboard</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <div className="grid grid-cols-1 gap-px bg-hp-rule md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scheduled"
          value={stats?.scheduled ?? 0}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Due in 7 days"
          value={stats?.dueSoon ?? 0}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdue ?? 0}
          accent={(stats?.overdue ?? 0) > 0}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Paid this month"
          value={formatCurrency(stats?.paidThisMonth ?? 0)}
          sub={`${stats?.paidThisMonthCount ?? 0} payments`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <SchedulesPanel isAdmin={isAdmin} />
      <HistoryPanel isAdmin={isAdmin} sessionUserId={sessionUserId} />
    </div>
  );
}

function StatCard({
  label, value, sub, accent, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-hp-card p-7 relative">
      {icon && (
        <span className={`absolute right-5 top-5 ${accent ? "text-hp-pink" : "text-hp-muted"}`}>
          {icon}
        </span>
      )}
      <span className="eyebrow mb-3">{label}</span>
      <div className={`mt-2 font-title text-[36px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>
        {value}
      </div>
      {sub && <div className="mt-3 text-[11px] uppercase tracking-eyebrow text-hp-muted">{sub}</div>}
    </div>
  );
}
