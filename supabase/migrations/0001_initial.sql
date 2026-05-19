-- 0001_initial.sql
-- Initial schema for PaySchedManager on Supabase.
-- Equivalent to running `drizzle-kit push` on a fresh database, but kept as
-- explicit SQL so `supabase db push` can apply it in CI.

create extension if not exists "pgcrypto";

-- Profiles: 1:1 with auth.users, holds application role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null default 'User',
  created_at timestamp not null default now()
);

-- Internal companies
create table if not exists public.internal_companies (
  id varchar primary key default gen_random_uuid(),
  name text not null,
  abbreviation text not null unique
);

-- Account banks
create table if not exists public.account_banks (
  id varchar primary key default gen_random_uuid(),
  name text not null unique,
  nickname text not null,
  created_at timestamp not null default now()
);

-- Payment accounts
create table if not exists public.payment_accounts (
  id varchar primary key default gen_random_uuid(),
  name text not null,
  account_type text not null,
  account_type_code text not null,
  internal_company_id varchar not null,
  bank_id varchar not null,
  last_four_digits text
);

-- Payment types
create table if not exists public.payment_types (
  id varchar primary key default gen_random_uuid(),
  name text not null unique
);

-- Expense types
create table if not exists public.expense_types (
  id varchar primary key default gen_random_uuid(),
  name text not null unique
);

-- Payment schedules
create table if not exists public.payment_schedules (
  id varchar primary key default gen_random_uuid(),
  expense_id text not null unique,
  internal_company_id varchar not null,
  vendor_name text not null,
  vendor_abbreviation text not null,
  amount numeric(10,2) not null,
  frequency text not null,
  next_due_date timestamp not null,
  payment_type_id varchar not null,
  payment_account_id varchar not null,
  expense_type_id varchar not null,
  status text not null default 'scheduled',
  created_at timestamp not null default now()
);

-- Payment records
create table if not exists public.payment_records (
  id varchar primary key default gen_random_uuid(),
  payment_schedule_id varchar,
  expense_id text not null,
  internal_company_id varchar not null,
  payment_date timestamp not null,
  amount numeric(10,2) not null,
  paid_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  payment_method text not null,
  payment_account_id varchar,
  confirmation_file text,
  approval_screenshot text,
  scheduled_due_date timestamp,
  days_late integer not null default 0,
  created_at timestamp not null default now()
);

create index if not exists payment_records_paid_date_idx on public.payment_records(payment_date);
create index if not exists payment_records_company_idx on public.payment_records(internal_company_id);
create index if not exists payment_records_schedule_idx on public.payment_records(payment_schedule_id);

-- Payment record audits
create table if not exists public.payment_record_audits (
  id varchar primary key default gen_random_uuid(),
  payment_record_id varchar not null,
  action text not null,
  reason text not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb,
  performed_by uuid not null references auth.users(id),
  created_at timestamp not null default now()
);

create index if not exists payment_record_audits_record_idx on public.payment_record_audits(payment_record_id);

-- Account mappings (CSV import)
create table if not exists public.account_mappings (
  id varchar primary key default gen_random_uuid(),
  csv_account_name text not null unique,
  payment_account_id varchar not null,
  created_at timestamp not null default now()
);

-- General audit log
create table if not exists public.audit_log (
  id varchar primary key default gen_random_uuid(),
  user_id uuid,
  username text,
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamp not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

-- Import jobs
create table if not exists public.import_jobs (
  id varchar primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending',
  payload jsonb not null,
  result jsonb,
  error_message text,
  created_at timestamp not null default now(),
  finished_at timestamp
);

-- Trigger: auto-create a profile row when a new auth.users row appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 'User')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
