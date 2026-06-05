"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, type BreakdownSlice } from "@/lib/expense-analytics";
import { HP_CHART_COLORS } from "./palette";

const MAX_SLICES = 6;

export type Dimension = "type" | "company" | "account";

export interface BreakdownSelection {
  dimension: Dimension;
  label: string;
  /** The underlying group keys this slice represents ("Other" maps to many). */
  memberKeys: string[];
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  type: "Type",
  company: "Company",
  account: "Account",
};

type DisplaySlice = BreakdownSlice & { memberKeys: string[] };

/** Collapse a long tail of small slices into a single "Other" slice. */
function collapse(slices: BreakdownSlice[]): DisplaySlice[] {
  if (slices.length <= MAX_SLICES) {
    return slices.map((s) => ({ ...s, memberKeys: [s.key] }));
  }
  const head = slices.slice(0, MAX_SLICES - 1).map((s) => ({ ...s, memberKeys: [s.key] }));
  const tail = slices.slice(MAX_SLICES - 1);
  const other: DisplaySlice = {
    key: "__other__",
    label: `Other (${tail.length})`,
    value: tail.reduce((sum, s) => sum + s.value, 0),
    count: tail.reduce((sum, s) => sum + s.count, 0),
    memberKeys: tail.map((s) => s.key),
  };
  return [...head, other];
}

function SliceTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as BreakdownSlice;
  return (
    <div className="border border-hp-rule bg-hp-card px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 max-w-[180px] truncate text-hp-muted">{slice.label}</div>
      <div className="font-title text-[16px] leading-none text-hp-ink tabular-nums">
        {formatCurrency(slice.value)}
      </div>
    </div>
  );
}

export function ExpenseBreakdownChart({
  byType,
  byCompany,
  byAccount,
  onSelect,
}: {
  byType: BreakdownSlice[];
  byCompany: BreakdownSlice[];
  byAccount: BreakdownSlice[];
  onSelect?: (selection: BreakdownSelection) => void;
}) {
  const [dimension, setDimension] = React.useState<Dimension>("type");

  const source = dimension === "type" ? byType : dimension === "company" ? byCompany : byAccount;
  const slices = React.useMemo(() => collapse(source), [source]);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const select = (slice: DisplaySlice) =>
    onSelect?.({ dimension, label: slice.label, memberKeys: slice.memberKeys });

  return (
    <div className="flex flex-col bg-hp-card p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-hp-pink" />
            <span className="eyebrow">Expense Breakdown</span>
          </div>
          <p className="mt-2 text-sm text-hp-body">
            Active scheduled amounts by {DIMENSION_LABELS[dimension].toLowerCase()}
          </p>
        </div>
        <div className="flex border border-hp-rule">
          {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => setDimension(dim)}
              className={cn(
                "px-3 py-1.5 text-[11px] uppercase tracking-eyebrow transition-colors",
                dimension === dim ? "bg-hp-ink text-hp-card" : "text-hp-muted hover:text-hp-ink",
              )}
            >
              {DIMENSION_LABELS[dim]}
            </button>
          ))}
        </div>
      </div>

      {total > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-6">
          <div className="h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Tooltip content={<SliceTooltip />} />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={75}
                  strokeWidth={2}
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  onClick={onSelect ? (_, i) => select(slices[i]) : undefined}
                  className={onSelect ? "cursor-pointer focus:outline-none" : undefined}
                >
                  {slices.map((slice, i) => (
                    <Cell key={slice.key} fill={HP_CHART_COLORS[i % HP_CHART_COLORS.length]} stroke="var(--surface-card)" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full min-w-0 space-y-2">
            {slices.map((slice, i) => {
              const pct = total > 0 ? (slice.value / total) * 100 : 0;
              return (
                <li
                  key={slice.key}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    onSelect && "-mx-2 cursor-pointer px-2 py-0.5 hover:bg-hp-inset",
                  )}
                  onClick={onSelect ? () => select(slice) : undefined}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: HP_CHART_COLORS[i % HP_CHART_COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-hp-body" title={slice.label}>{slice.label}</span>
                  <span className="tabular-nums text-hp-ink">{formatCurrency(slice.value)}</span>
                  <span className="w-10 text-right text-xs text-hp-muted">{pct.toFixed(0)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-6 flex min-h-[200px] w-full flex-col items-center justify-center border border-dashed border-hp-rule text-center">
          <PieIcon className="mb-3 h-9 w-9 text-hp-muted" />
          <p className="text-sm font-medium text-hp-ink">No active schedules</p>
          <p className="text-xs text-hp-muted">Add payment schedules to see the breakdown</p>
        </div>
      )}
    </div>
  );
}
