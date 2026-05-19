-- 0002_vendors.sql
-- Vendor reference table for managing vendor entries from Settings.

create table if not exists public.vendors (
  id varchar primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text not null,
  created_at timestamp not null default now()
);

alter table public.vendors enable row level security;

create policy "vendors_read"
  on public.vendors for select to authenticated
  using (true);

create policy "vendors_admin_write"
  on public.vendors for all to authenticated
  using (public.profile_role() = 'Admin')
  with check (public.profile_role() = 'Admin');
