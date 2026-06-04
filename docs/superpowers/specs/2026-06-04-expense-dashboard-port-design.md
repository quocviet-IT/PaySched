# Expense Dashboard Port — Design

**Date:** 2026-06-04
**Status:** Approved (design), pending spec review
**Author:** PIT010

## Goal

Port the expense-dashboard feature cluster from the upstream `vt-ctyhp/PaySchedManager`
repo (Vite/React + Express) into this Next.js port (`PaySchedManager-next`). The
upstream work was delivered in three commits on 2026-06-04:

- `96b67b71` — Turn home page into a proper expense dashboard
- `a82a3bc3` — Add chart/KPI drill-downs, expense detail view, and schedule active state
- `9d1c2a49` — Fold reports into the expense dashboard

The home page becomes an analytics-first **Expense Dashboard** (dollar KPIs, charts,
drill-downs, expense detail, payment issues) while preserving all existing schedule
management and payment history. The standalone Reports page is folded in.

## Principles

1. **Faithful port.** Keep 100% of upstream functionality and logic. Only diverge
   where the `-next` platform requires it.
2. **Restyle to the HP theme.** Functionality is identical; visuals follow the
   existing `-next` "HP editorial" design system (`hp-ink`, `hp-pink`, `hp-card`,
   `hp-rule`, `hp-muted`, `eyebrow`, `font-title`, `tracking-eyebrow`). Do not copy
   the upstream shadcn-default look.
3. **Align frequencies to `-next`.** `lib/recurrence.ts` defines
   `["one-time", "bi-weekly", "monthly", "quarterly", "yearly"]` — there is **no
   "weekly"**. Drop `weekly` from the ported analytics (`MONTHLY_FACTOR`, `advance`).
4. **Use the Drizzle migration pipeline,** not raw `ALTER TABLE`. Upstream applies
   schema changes directly; `-next` generates SQL into `supabase/migrations/` and
   applies it via `scripts/apply-migration.mjs`.

## Architecture (Approach A — client-side analytics)

Data fetching maps 1:1 to upstream: `-next` uses TanStack React Query with the query
key set to the API URL (e.g. `["/api/payment-schedules"]`, `["/api/payment-records"]`).
The dashboard fetches raw schedules + records and computes all analytics on the client
via a pure helper module. This keeps the port faithful, touches no backend, and is the
only option that cleanly supports drill-downs and the detail dialog (both need the raw
rows on the client).

Rejected alternatives: server-side computation in `/api/dashboard` (rewrites logic,
diverges from upstream, can't feed client drill-downs) and a hybrid split (double the
complexity for no benefit).

### New files

| File | Role |
|---|---|
| `lib/expense-analytics.ts` | Pure lib: `monthlyRunRate`, `projectOccurrences`, `monthlyForecast`, `breakdownBy`, `monthlySpendTrend`, `isActive`, `advance`, `MONTHLY_FACTOR`, `FREQUENCY_LABELS`, currency formatters. Ported from upstream; `weekly` removed. |
| `app/(app)/dashboard/charts/expense-forecast-chart.tsx` | Projected-spend bar chart (6–12 months), recharts |
| `app/(app)/dashboard/charts/expense-breakdown-chart.tsx` | Donut breakdown, toggleable by type / company / account |
| `app/(app)/dashboard/charts/spend-trend-chart.tsx` | Actual-spend trend chart |
| `app/(app)/dashboard/drill-down-dialog.tsx` | Filtered drill-down table (search + company/type filters, count + total footer) |
| `app/(app)/dashboard/expense-detail-dialog.tsx` | Single-expense detail + full payment history + Edit button |
| `app/(app)/dashboard/upcoming-panel.tsx` | Upcoming payments panel, By Company / List toggle |
| `app/(app)/dashboard/payment-issues-panel.tsx` | Overdue/late/under/overpaid panel, priority-sorted, count badge |

### Modified files

- `shared/schema.ts` — add `isActive: boolean("is_active").notNull().default(true)`
  to `paymentSchedules` (matches upstream exactly).
- `app/(app)/dashboard/dashboard-view.tsx` — rewrite: dollar KPI row, header timeframe
  toggle, tabs (Overview / Schedules / History), single shared record-payment dialog.
  Existing `SchedulesPanel` / `HistoryPanel` move under tabs.
- `app/(app)/dashboard/schedules-panel.tsx` (schedule card) — "Inactive" badge +
  reactivate.
- The `-next` equivalent of `EditPaymentDialog` — Active toggle that cancels a schedule.
- `app/(app)/reports/`, `/api/reports`, header Reports button — **removed** in Phase 3.
- `lib/recurrence.ts` — unchanged; the analytics lib is self-contained (minor logic
  duplication accepted to stay faithful to upstream).

### Migration

`npm run db:generate` produces SQL in `supabase/migrations/`; apply with
`node scripts/apply-migration.mjs`. Net effect equals upstream's
`ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;`.

## Phased delivery

Each phase is independently verifiable and committable.

### Phase 1 — Foundation + KPIs + basic Overview
- `is_active` migration (generate + apply).
- Port `lib/expense-analytics.ts` (drop `weekly`).
- Rewrite `dashboard-view.tsx`: dollar KPI row (monthly run-rate / Upcoming / Overdue /
  Paid this month — amounts + counts) and an **Overview** tab with forecast chart,
  breakdown donut (toggle type/company/account), spend trend chart, and a basic
  upcoming/overdue list.
- Move Schedules & History under tabs; promote record-payment dialog to one shared
  controlled instance.
- **Verify:** clean build; dashboard renders correct figures against real data.

### Phase 2 — Drill-downs + detail + active/cancel lifecycle
- Charts & KPI tiles clickable → `drill-down-dialog` (search + company/type filter,
  count/total footer).
- Drill-down row → `expense-detail-dialog` (full fields + payment history + Edit button
  that jumps to the schedule's edit form).
- Active toggle in the edit dialog cancels a schedule; inactive schedules drop out of
  run-rate, due-soon, overdue, forecast, breakdown, upcoming, and all drill-downs;
  dimmed "Inactive" badge with reactivate.
- **Verify:** drill-downs, filters, detail history, and cancel/reactivate updating KPIs
  in real time.

### Phase 3 — Fold Reports + timeframe + Payment Issues
- Global header **timeframe toggle** (Next 7/30/90 days + 12 months) driving the Upcoming
  KPI, forecast horizon, the upcoming panel, and the company breakdown together.
- Rename the "Due Next 30 Days" KPI to a timeframe-aware **"Upcoming"**.
- `upcoming-panel` with By Company / List toggle (by-company rows drill into a company's
  schedules — replaces the old Reports table; list view keeps Record actions).
- `payment-issues-panel` (overdue/late/under/overpaid, priority-sorted, count badge);
  clicking an issue opens the expense detail.
- Move Spend Trend to the bottom of the Overview tab.
- **Remove** the `/reports` route, page, header button, and `/api/reports` if unused.
- **Verify:** clean build; no broken links to `/reports`.

## Testing

- `lib/expense-analytics.ts` is pure — unit-test occurrence projection, run-rate
  normalization, forecast bucketing, breakdown grouping, and spend trend on fixed dates
  (no `Date.now()` in tests; pass `now` explicitly, as the lib already supports).
- Per-phase manual verification against real data as listed above.
- Each phase: `npm run build` (and `npm run lint`) must pass before commit.

## Out of scope

- No backend/analytics-endpoint rewrite (Approach A is client-side).
- No reintroduction of "weekly" frequency.
- No unrelated refactoring of `recurrence.ts` or existing panels beyond what the feature
  requires.
