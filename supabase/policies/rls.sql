-- rls.sql
-- Row Level Security policies. Run AFTER 0001_initial.sql.
--
-- Read model: every signed-in user can read everything (this is an internal
-- finance app; data is shared across the team). Writes are restricted by role.
--
-- Helper: profile_role() returns the calling user's role, defaulting to 'User'.

create or replace function public.profile_role()
returns text
language sql
stable security definer set search_path = public
as $$
  select coalesce(role, 'User') from public.profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- Profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_read_self_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.profile_role() = 'Admin');

create policy "profiles_admin_write"
  on public.profiles for all to authenticated
  using (public.profile_role() = 'Admin')
  with check (public.profile_role() = 'Admin');

-- ----------------------------------------------------------------------------
-- Reference tables: authenticated read, admin write
-- ----------------------------------------------------------------------------
alter table public.internal_companies enable row level security;
alter table public.account_banks      enable row level security;
alter table public.payment_accounts   enable row level security;
alter table public.payment_types      enable row level security;
alter table public.expense_types      enable row level security;
alter table public.account_mappings   enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'internal_companies','account_banks','payment_accounts',
      'payment_types','expense_types','account_mappings'
    ])
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.profile_role() = ''Admin'') with check (public.profile_role() = ''Admin'')',
      t || '_admin_write', t
    );
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- Schedules: authenticated read + write
-- ----------------------------------------------------------------------------
alter table public.payment_schedules enable row level security;

create policy "schedules_read"
  on public.payment_schedules for select to authenticated using (true);

create policy "schedules_write"
  on public.payment_schedules for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Records: read all; insert as self; update/delete owner-or-admin
-- ----------------------------------------------------------------------------
alter table public.payment_records enable row level security;

create policy "records_read"
  on public.payment_records for select to authenticated using (true);

create policy "records_insert_self"
  on public.payment_records for insert to authenticated
  with check (paid_by = auth.uid());

create policy "records_update_owner_or_admin"
  on public.payment_records for update to authenticated
  using (paid_by = auth.uid() or public.profile_role() = 'Admin')
  with check (paid_by = auth.uid() or public.profile_role() = 'Admin');

create policy "records_delete_owner_or_admin"
  on public.payment_records for delete to authenticated
  using (paid_by = auth.uid() or public.profile_role() = 'Admin');

-- ----------------------------------------------------------------------------
-- Record audits: insert-by-self, read all (auditors), no update/delete
-- ----------------------------------------------------------------------------
alter table public.payment_record_audits enable row level security;

create policy "record_audits_read"
  on public.payment_record_audits for select to authenticated using (true);

create policy "record_audits_insert_self"
  on public.payment_record_audits for insert to authenticated
  with check (performed_by = auth.uid());

-- ----------------------------------------------------------------------------
-- Audit log: admin-only read; inserts via service-role only
-- ----------------------------------------------------------------------------
alter table public.audit_log enable row level security;

create policy "audit_log_admin_read"
  on public.audit_log for select to authenticated
  using (public.profile_role() = 'Admin');

-- ----------------------------------------------------------------------------
-- Import jobs: owner-only
-- ----------------------------------------------------------------------------
alter table public.import_jobs enable row level security;

create policy "import_jobs_owner"
  on public.import_jobs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
