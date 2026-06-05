"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock } from "lucide-react";
import {
  formatCurrency,
  formatCurrencyCompact,
  type ForecastBucket,
} from "@/lib/expense-analytics";
import { AXIS_TICK, GRID_STROKE, HP_CHART_COLORS } from "./palette";

function ForecastTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload as ForecastBucket;
  return (
    <div className="border border-hp-rule bg-hp-card px-3 py-2 text-xs shadow-sm">
      <div className="eyebrow mb-1">{bucket.label}</div>
      <div className="font-title text-[18px] leading-none text-hp-ink tabular-nums">
        {formatCurrency(bucket.total)}
      </div>
      <div className="mt-1 text-hp-muted">
        {bucket.count} payment{bucket.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function ExpenseForecastChart({
  data,
  onSelectMonth,
}: {
  data: ForecastBucket[];
  onSelectMonth?: (bucket: ForecastBucket) => void;
}) {
  const total = data.reduce((sum, bucket) => sum + bucket.total, 0);
  const hasData = total > 0;
  const handleClick = (state: any) => {
    const i = state?.activeTooltipIndex;
    if (i != null && data[i]) onSelectMonth?.(data[i]);
  };

  return (
    <div className="bg-hp-card p-7">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-hp-pink" />
        <span className="eyebrow">Upcoming Expense Forecast</span>
      </div>
      <p className="mt-2 text-sm text-hp-body">
        Projected obligations across the next {data.length} months, including recurring
        payments — <span className="font-medium text-hp-ink">{formatCurrency(total)}</span> total
      </p>

      {hasData ? (
        <div className="mt-6 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: 4, right: 4, top: 8 }}
              onClick={onSelectMonth ? handleClick : undefined}
              className={onSelectMonth ? "cursor-pointer" : undefined}
            >
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={AXIS_TICK}
                tickFormatter={(value) => formatCurrencyCompact(Number(value))}
              />
              <Tooltip cursor={{ fill: "var(--surface-inset)" }} content={<ForecastTooltip />} />
              <Bar dataKey="total" fill={HP_CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart icon={<CalendarClock className="mb-3 h-9 w-9 text-hp-muted" />} title="No upcoming payments projected" hint="Scheduled payments will appear here as a monthly forecast" />
      )}
    </div>
  );
}

export function EmptyChart({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mt-6 flex h-[220px] flex-col items-center justify-center border border-dashed border-hp-rule text-center">
      {icon}
      <p className="text-sm font-medium text-hp-ink">{title}</p>
      <p className="text-xs text-hp-muted">{hint}</p>
    </div>
  );
}
