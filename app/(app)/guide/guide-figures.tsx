"use client";

import * as React from "react";

/** Numbered callout badge, matched to the figure's `callouts` legend in content.ts. */
function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hp-pink text-[11px] font-medium tabular-nums text-hp-card">
      {n}
    </span>
  );
}

/** A faux app window so the mockup reads as "a picture of the app", like the sample. */
function Window({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden border border-hp-rule bg-hp-foundation">
      <div className="flex items-center gap-1.5 border-b border-hp-rule px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-hp-rule" />
        <span className="h-2 w-2 rounded-full bg-hp-rule" />
        <span className="h-2 w-2 rounded-full bg-hp-rule" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniKpi({
  label, value, sub, accent, marker,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  marker?: number;
}) {
  return (
    <div className="relative bg-hp-card p-4">
      {marker != null && <span className="absolute right-2 top-2"><Marker n={marker} /></span>}
      <span className="eyebrow mb-2">{label}</span>
      <div className={`font-title text-[22px] leading-none tabular-nums ${accent ? "text-hp-pink" : "text-hp-ink"}`}>{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-eyebrow text-hp-muted">{sub}</div>
    </div>
  );
}

function DashboardKpis() {
  return (
    <Window>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          <Marker n={2} />
        </span>
        <div className="flex border border-hp-rule text-[10px] uppercase tracking-eyebrow">
          <span className="px-2.5 py-1 text-hp-muted">7 Days</span>
          <span className="bg-hp-ink px-2.5 py-1 text-hp-card">30 Days</span>
          <span className="px-2.5 py-1 text-hp-muted">90 Days</span>
          <span className="px-2.5 py-1 text-hp-muted">12 Months</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-hp-rule sm:grid-cols-4">
        <MiniKpi label="Monthly Run-Rate" value="$12,400" sub="Per month" />
        <MiniKpi label="Upcoming" value="$4,800" sub="6 due · 30 days" marker={1} />
        <MiniKpi label="Overdue" value="$1,300" sub="2 past due" accent marker={3} />
        <MiniKpi label="Paid This Month" value="$9,200" sub="11 recorded" />
      </div>
    </Window>
  );
}

function ScheduleRow() {
  return (
    <Window>
      <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_auto] items-center gap-3 border-b border-hp-rule pb-2 text-[10px] uppercase tracking-eyebrow text-hp-muted">
        <span>Vendor</span>
        <span>Amount</span>
        <span>Status</span>
        <span />
      </div>
      <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_auto] items-center gap-3 border-b border-hp-rule py-3 text-sm">
        <div>
          <div className="text-hp-ink">City Power</div>
          <div className="text-[10px] uppercase tracking-eyebrow text-hp-muted">EXP-0142</div>
        </div>
        <span className="tabular-nums text-hp-ink">$420.00</span>
        <span className="uppercase tracking-eyebrow text-[10px] text-hp-ink">In 5d</span>
        <div className="flex items-center gap-1">
          <span className="flex h-6 w-6 items-center justify-center border border-hp-rule text-hp-muted">$</span>
          <span className="flex h-6 w-6 items-center justify-center border border-hp-rule text-hp-muted">✎</span>
          <Marker n={1} />
        </div>
      </div>
      <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_auto] items-center gap-3 py-3 text-sm opacity-55">
        <div className="flex items-center gap-2">
          <span className="text-hp-ink">Old Lease</span>
          <span className="border border-hp-rule px-1.5 py-0.5 text-[9px] uppercase tracking-eyebrow text-hp-muted">Inactive</span>
        </div>
        <span className="tabular-nums text-hp-ink">$1,500.00</span>
        <span className="uppercase tracking-eyebrow text-[10px] text-hp-muted">Inactive</span>
        <div className="flex justify-end"><Marker n={2} /></div>
      </div>
    </Window>
  );
}

function MiniField({ label, value, marker }: { label: string; value: string; marker?: number }) {
  return (
    <div className="relative">
      {marker != null && <span className="absolute -right-1 -top-1"><Marker n={marker} /></span>}
      <div className="mb-1 text-[10px] uppercase tracking-eyebrow text-hp-muted">{label}</div>
      <div className="border border-hp-rule bg-hp-card px-2.5 py-1.5 text-sm text-hp-body">{value}</div>
    </div>
  );
}

function RecordForm() {
  return (
    <Window>
      <div className="mb-3 font-title text-[16px] text-hp-ink">Record Payment</div>
      <div className="grid grid-cols-2 gap-3">
        <MiniField label="Payment date" value="2026-06-05" />
        <MiniField label="Amount" value="$420.00" />
        <MiniField label="Method" value="Bank transfer" />
        <MiniField label="Approved by" value="Linh N." />
        <MiniField label="Confirmation file" value="receipt.pdf" marker={1} />
        <MiniField label="Approval screenshot" value="approved.png" marker={2} />
      </div>
    </Window>
  );
}

function DrillDown() {
  return (
    <Window>
      <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 border-b border-hp-rule pb-2 text-[10px] uppercase tracking-eyebrow text-hp-muted">
        <span>Vendor</span>
        <span>Company</span>
        <span className="text-right">Amount</span>
      </div>
      <div className="relative grid grid-cols-[1.4fr_1fr_auto] gap-3 border-b border-hp-rule bg-hp-inset py-2.5 text-sm">
        <span className="text-hp-ink">City Power</span>
        <span className="text-hp-muted">Acme</span>
        <span className="text-right tabular-nums text-hp-ink">$420.00</span>
        <span className="absolute -right-1 top-1.5"><Marker n={1} /></span>
      </div>
      <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 border-b border-hp-rule py-2.5 text-sm">
        <span className="text-hp-ink">Cloud Co</span>
        <span className="text-hp-muted">Acme</span>
        <span className="text-right tabular-nums text-hp-ink">$99.00</span>
      </div>
      <div className="relative mt-2 flex items-center justify-between text-[11px] uppercase tracking-eyebrow text-hp-muted">
        <span>2 of 6 items</span>
        <span className="flex items-center gap-2">
          <span className="font-title text-[15px] normal-case tracking-normal text-hp-ink">$519.00</span>
          <Marker n={2} />
        </span>
      </div>
    </Window>
  );
}

function CsvImport() {
  return (
    <Window>
      <div className="relative">
        <span className="absolute -right-1 -top-1"><Marker n={1} /></span>
        <div className="mb-1 text-[10px] uppercase tracking-eyebrow text-hp-muted">Match your columns</div>
        <div className="space-y-1.5 border border-hp-rule p-3 text-sm">
          <div className="flex items-center gap-2"><span className="flex-1 truncate text-hp-body">&quot;Vendor&quot;</span><span className="text-hp-muted">→</span><span className="w-24 text-hp-ink">Vendor</span></div>
          <div className="flex items-center gap-2"><span className="flex-1 truncate text-hp-body">&quot;Amt&quot;</span><span className="text-hp-muted">→</span><span className="w-24 text-hp-ink">Amount</span></div>
          <div className="flex items-center gap-2"><span className="flex-1 truncate text-hp-body">&quot;Due&quot;</span><span className="text-hp-muted">→</span><span className="w-24 text-hp-ink">Next due</span></div>
        </div>
      </div>
      <div className="relative mt-3 flex items-center justify-between border border-hp-rule bg-hp-inset px-3 py-2 text-sm">
        <span className="text-hp-body">Preview · 12 rows ready</span>
        <span className="flex items-center gap-2">
          <span className="bg-hp-ink px-2.5 py-1 text-[10px] uppercase tracking-eyebrow text-hp-card">Confirm</span>
          <Marker n={2} />
        </span>
      </div>
    </Window>
  );
}

function UsersTable() {
  return (
    <Window>
      <div className="grid grid-cols-[1.5fr_1fr_auto] gap-3 border-b border-hp-rule pb-2 text-[10px] uppercase tracking-eyebrow text-hp-muted">
        <span>User</span>
        <span>Role</span>
        <span />
      </div>
      <div className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 border-b border-hp-rule py-2.5 text-sm">
        <span className="text-hp-ink">linh.n</span>
        <span className="uppercase tracking-eyebrow text-[10px] text-hp-muted">User</span>
        <span />
      </div>
      <div className="relative grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 py-2.5 text-sm">
        <span className="text-hp-ink">admin</span>
        <span className="uppercase tracking-eyebrow text-[10px] text-hp-pink">Admin <span className="align-middle"><Marker n={1} /></span></span>
        <span className="flex items-center justify-end gap-2">
          <span className="flex h-6 w-6 items-center justify-center border border-hp-rule text-hp-muted">🗑</span>
          <Marker n={2} />
        </span>
      </div>
    </Window>
  );
}

function MasterLists() {
  const groups: [string, string[]][] = [
    ["Companies", ["Acme", "HP Jewelry"]],
    ["Vendors", ["City Power", "Cloud Co"]],
    ["Accounts", ["Checking *1234"]],
    ["Payment types", ["Bank transfer", "Card"]],
    ["Expense types", ["Rent", "Utilities"]],
  ];
  return (
    <Window>
      <div className="relative space-y-2.5">
        <span className="absolute -right-1 -top-1"><Marker n={1} /></span>
        {groups.map(([label, items]) => (
          <div key={label} className="flex flex-wrap items-center gap-2">
            <span className="w-28 shrink-0 text-[10px] uppercase tracking-eyebrow text-hp-muted">{label}</span>
            {items.map((it) => (
              <span key={it} className="border border-hp-rule bg-hp-card px-2 py-0.5 text-[12px] text-hp-body">{it}</span>
            ))}
          </div>
        ))}
      </div>
    </Window>
  );
}

const VARIANTS: Record<string, React.FC> = {
  "dashboard-kpis": DashboardKpis,
  "schedule-row": ScheduleRow,
  "record-form": RecordForm,
  "drilldown": DrillDown,
  "csv-import": CsvImport,
  "users-table": UsersTable,
  "master-lists": MasterLists,
};

export function GuideFigure({ variant }: { variant: string }) {
  const Cmp = VARIANTS[variant];
  if (!Cmp) return null;
  return <Cmp />;
}
