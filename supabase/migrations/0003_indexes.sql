-- 0003_indexes.sql
-- Indexes on columns we frequently filter, join, or sort by.
-- All are CONCURRENTLY-safe via IF NOT EXISTS — re-running is a no-op.

-- profiles.username: looked up on every sign-in.
create index if not exists profiles_username_idx
  on public.profiles (username);

-- payment_schedules: dashboard stats filter by status + next_due_date;
-- schedules-panel filters by frequency; payment-records joins by schedule id.
create index if not exists payment_schedules_status_due_idx
  on public.payment_schedules (status, next_due_date);

create index if not exists payment_schedules_frequency_idx
  on public.payment_schedules (frequency);

create index if not exists payment_schedules_expense_id_idx
  on public.payment_schedules (expense_id);

-- payment_records: history panel sorts by payment_date desc;
-- audits list filters by paymentScheduleId.
create index if not exists payment_records_payment_date_idx
  on public.payment_records (payment_date desc);

create index if not exists payment_records_schedule_idx
  on public.payment_records (payment_schedule_id);

create index if not exists payment_records_expense_idx
  on public.payment_records (expense_id);

-- payment_record_audits: AuditHistoryButton filters by paymentRecordId.
create index if not exists payment_record_audits_record_idx
  on public.payment_record_audits (payment_record_id);

-- audit_log: General Activity tab orders by created_at desc + limit 200;
-- cron cleanup deletes rows older than 90 days.
create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);

-- vendors: dropdown in schedule form orders by name.
create index if not exists vendors_name_idx
  on public.vendors (name);

-- account_mappings: CSV import looks up by csv_account_name.
create index if not exists account_mappings_csv_name_idx
  on public.account_mappings (csv_account_name);
