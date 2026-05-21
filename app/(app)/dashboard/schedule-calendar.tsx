"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { PaymentSchedule } from "@shared/schema";

interface Props {
  schedules: PaymentSchedule[];
  onRecordPayment: (schedule: PaymentSchedule) => void;
}

interface Occurrence {
  date: Date;
  schedule: PaymentSchedule;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function advanceByFrequency(d: Date, frequency: string): Date | null {
  const next = new Date(d);
  switch (frequency) {
    case "bi-weekly": next.setDate(next.getDate() + 14); return next;
    case "monthly":   next.setMonth(next.getMonth() + 1); return next;
    case "quarterly": next.setMonth(next.getMonth() + 3); return next;
    case "yearly":    next.setFullYear(next.getFullYear() + 1); return next;
    default: return null; // "one-time" or unknown
  }
}

/** Local YYYY-MM-DD key (avoids UTC conversion drift). */
function isoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First day of the 6-week grid that contains `monthStart`. Grid starts Monday. */
function getGridStart(monthStart: Date): Date {
  const d = new Date(monthStart);
  // 0=Sun,1=Mon,...; we want Monday as start, so weekday-1 with Sunday wrapping to 6.
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthGrid(viewMonth: Date): Date[] {
  const start = getGridStart(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function expandSchedules(
  schedules: PaymentSchedule[],
  gridStart: Date,
  gridEnd: Date,
): Map<string, Occurrence[]> {
  const byDay = new Map<string, Occurrence[]>();
  const push = (date: Date, schedule: PaymentSchedule) => {
    const key = isoLocalDate(date);
    const bucket = byDay.get(key) ?? [];
    bucket.push({ date: new Date(date), schedule });
    byDay.set(key, bucket);
  };

  for (const s of schedules) {
    if (s.status === "completed") continue;
    let cursor = new Date(s.nextDueDate);
    cursor.setHours(0, 0, 0, 0);

    // If the next_due_date is BEFORE the grid (overdue), surface it on the
    // original date if that's inside the grid — otherwise skip.
    if (cursor < gridStart) {
      // Advance the cursor to the first occurrence >= gridStart for recurring,
      // but ALSO keep the overdue date visible on today's column so the user sees it.
      // For one-time overdue, skip — the table is the place for overdue.
      const step = advanceByFrequency(cursor, s.frequency);
      if (!step) continue; // one-time, already past
      while (cursor < gridStart) {
        const c = advanceByFrequency(cursor, s.frequency);
        if (!c) break;
        cursor = c;
      }
    }

    let guard = 0;
    while (cursor <= gridEnd && guard < 60) {
      push(cursor, s);
      const step = advanceByFrequency(cursor, s.frequency);
      if (!step) break;
      cursor = step;
      guard += 1;
    }
  }

  return byDay;
}

export function ScheduleCalendar({ schedules, onRecordPayment }: Props) {
  const [viewMonth, setViewMonth] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [popoverDay, setPopoverDay] = React.useState<string | null>(null);

  const grid = React.useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const gridStart = grid[0];
  const gridEnd = grid[grid.length - 1];

  const byDay = React.useMemo(
    () => expandSchedules(schedules, gridStart, gridEnd),
    [schedules, gridStart, gridEnd],
  );

  const today = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const todayKey = isoLocalDate(today);

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const prev = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const next = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  const popoverOccurrences = popoverDay ? byDay.get(popoverDay) ?? [] : [];
  const popoverDate = popoverDay
    ? new Date(`${popoverDay}T00:00:00`)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="font-title text-[20px] text-hp-ink">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={goToday}>Today</Button>
          <Button size="icon" variant="ghost" aria-label="Previous month" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Next month" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-t border-l border-hp-rule">
          {WEEK_DAYS.map((w) => (
            <div key={w} className="border-b border-r border-hp-rule px-2 py-1.5 bg-hp-inset uppercase tracking-eyebrow text-[10px] text-hp-muted">
              {w}
            </div>
          ))}
          {grid.map((d) => {
            const key = isoLocalDate(d);
            const occs = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isToday = key === todayKey;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const total = occs.reduce((s, o) => s + Number(o.schedule.amount), 0);
            const hasOverdue = occs.length > 0 && d < today;

            const VISIBLE = 3;
            return (
              <button
                key={key}
                type="button"
                onClick={() => occs.length > 0 && setPopoverDay(key)}
                disabled={occs.length === 0}
                className={`
                  border-b border-r border-hp-rule min-h-[120px] p-1.5 text-left transition-colors
                  flex flex-col gap-1
                  ${inMonth ? "bg-hp-card" : "bg-hp-inset/50"}
                  ${isToday ? "ring-1 ring-hp-pink ring-inset" : ""}
                  ${isWeekend && inMonth ? "bg-hp-foundation" : ""}
                  ${hasOverdue ? "bg-hp-pink/5" : ""}
                  ${occs.length > 0 ? "hover:bg-hp-inset cursor-pointer" : "cursor-default"}
                `}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className={`text-[12px] tabular-nums ${
                    isToday ? "text-hp-pink font-semibold" :
                    inMonth ? "text-hp-ink" : "text-hp-muted"
                  }`}>
                    {d.getDate()}
                  </span>
                  {occs.length > 0 && (
                    <span className="text-[9px] uppercase tracking-eyebrow text-hp-muted tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  )}
                </div>
                {occs.length > 0 && (
                  <div className="space-y-0.5 flex-1 min-w-0">
                    {occs.slice(0, VISIBLE).map((o, i) => {
                      const chipOverdue = d < today;
                      return (
                        <div
                          key={`${o.schedule.id}-${i}`}
                          title={`${o.schedule.vendorName} · ${formatCurrency(Number(o.schedule.amount))}`}
                          className={`
                            text-[10px] truncate px-1.5 py-0.5 leading-tight
                            border-l-2
                            ${chipOverdue
                              ? "bg-hp-pink/10 border-hp-pink text-hp-pink"
                              : "bg-hp-ink/5 border-hp-ink text-hp-ink"}
                          `}
                        >
                          <span className="truncate">{o.schedule.vendorName}</span>
                        </div>
                      );
                    })}
                    {occs.length > VISIBLE && (
                      <div className="text-[10px] text-hp-muted px-1.5 font-body">
                        +{occs.length - VISIBLE} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile list fallback */}
      <div className="md:hidden space-y-3">
        {grid
          .filter((d) => d.getMonth() === viewMonth.getMonth())
          .map((d) => {
            const key = isoLocalDate(d);
            const occs = byDay.get(key) ?? [];
            if (occs.length === 0) return null;
            const isToday = key === todayKey;
            const total = occs.reduce((s, o) => s + Number(o.schedule.amount), 0);
            return (
              <div
                key={key}
                className={`border border-hp-rule p-3 ${isToday ? "border-hp-pink" : ""}`}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <div className="text-hp-ink font-body">
                    {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-[11px] tabular-nums text-hp-body">{formatCurrency(total)}</div>
                </div>
                <div className="space-y-1.5">
                  {occs.map((o, i) => (
                    <div key={`${o.schedule.id}-${i}`} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-hp-ink">{o.schedule.vendorName}</div>
                        <div className="text-[10px] uppercase tracking-eyebrow text-hp-muted">
                          {o.schedule.frequency} · {formatCurrency(Number(o.schedule.amount))}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" aria-label="Record payment"
                        onClick={() => onRecordPayment(o.schedule)}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
          .filter(Boolean)}
        {grid
          .filter((d) => d.getMonth() === viewMonth.getMonth() && (byDay.get(isoLocalDate(d))?.length ?? 0) > 0)
          .length === 0 && (
            <p className="py-8 text-center text-sm text-hp-muted">No schedules this month.</p>
          )}
      </div>

      {/* Day popup (shared by desktop) */}
      <Dialog open={popoverDay !== null} onOpenChange={(v) => !v && setPopoverDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {popoverDate?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {popoverOccurrences.map((o, i) => (
              <div
                key={`${o.schedule.id}-${i}`}
                className="flex items-center justify-between p-3 border border-hp-rule"
              >
                <div className="min-w-0">
                  <div className="text-hp-ink truncate">{o.schedule.vendorName}</div>
                  <div className="text-[10px] uppercase tracking-eyebrow text-hp-muted">
                    {o.schedule.expenseId} · {o.schedule.frequency}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="tabular-nums text-hp-ink text-sm">
                    {formatCurrency(Number(o.schedule.amount))}
                  </div>
                  <Button size="sm" variant="secondary"
                    onClick={() => { onRecordPayment(o.schedule); setPopoverDay(null); }}>
                    Record
                  </Button>
                </div>
              </div>
            ))}
            {popoverOccurrences.length === 0 && (
              <p className="py-4 text-center text-sm text-hp-muted">No schedules.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
