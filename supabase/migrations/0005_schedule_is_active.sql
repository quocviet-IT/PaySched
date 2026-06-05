-- 0005_schedule_is_active.sql
-- Add an active/cancelled flag to payment_schedules.
-- Defaults to true so existing schedules remain active obligations.
-- Setting is_active = false cancels a schedule: it then drops out of the
-- run-rate, due-soon, overdue, forecast, breakdown, and upcoming views.

alter table public.payment_schedules
  add column if not exists is_active boolean not null default true;
