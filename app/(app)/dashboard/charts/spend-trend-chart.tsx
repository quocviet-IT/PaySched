"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import {
  formatCurrency,
  formatCurrencyCompact,
  type TrendPoint,
} from "@/lib/expense-analytics";
import { AXIS_TICK, GRID_STROKE } from "./palette";
import { EmptyChart } from "./expense-forecast-chart";

const TREND_COLOR = "var(--ink-primary)";

function TrendTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="border border-hp-rule bg-hp-card px-3 py-2 text-xs shadow-sm">
      <div className="eyebrow mb-1">{point.label}</div>
      <div className="font-title text-[18px] leading-none text-hp-ink tabular-nums">
        {formatCurrency(point.total)}
      </div>
      <div className="mt-1 text-hp-muted">
        {point.count} payment{point.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function SpendTrendChart({
  data,
  onSelectMonth,
}: {
  data: TrendPoint[];
  onSelectMonth?: (point: TrendPoint) => void;
}) {
  const total = data.reduce((sum, point) => sum + point.total, 0);
  const hasData = total > 0;
  const handleClick = (state: any) => {
    const i = state?.activeTooltipIndex;
    if (i != null && data[i]) onSelectMonth?.(data[i]);
  };

  return (
    <div className="bg-hp-card p-7">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-hp-pink" />
        <span className="eyebrow">Spending Trend</span>
      </div>
      <p className="mt-2 text-sm text-hp-body">
        Actual payments recorded over the last {data.length} months
      </p>

      {hasData ? (
        <div className="mt-6 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: 4, right: 4, top: 8 }}
              onClick={onSelectMonth ? handleClick : undefined}
              className={onSelectMonth ? "cursor-pointer" : undefined}
            >
              <defs>
                <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TREND_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={TREND_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={AXIS_TICK}
                tickFormatter={(value) => formatCurrencyCompact(Number(value))}
              />
              <Tooltip cursor={{ stroke: GRID_STROKE }} content={<TrendTooltip />} />
              <Area dataKey="total" type="monotone" fill="url(#fillSpend)" stroke={TREND_COLOR} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart icon={<TrendingUp className="mb-3 h-9 w-9 text-hp-muted" />} title="No payments recorded yet" hint="Recorded payments will appear here as a monthly trend" />
      )}
    </div>
  );
}
