-- 0004_record_refs.sql
-- Add check number, reference number, and memo fields to payment_records.
-- All nullable so existing rows remain valid.

alter table public.payment_records
  add column if not exists check_number     text,
  add column if not exists reference_number text,
  add column if not exists memo             text;

-- Help search by check number / reference number.
create index if not exists payment_records_check_number_idx
  on public.payment_records (check_number) where check_number is not null;

create index if not exists payment_records_reference_number_idx
  on public.payment_records (reference_number) where reference_number is not null;
