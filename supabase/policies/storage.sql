-- storage.sql
-- Storage bucket + policies for confirmation files and approval screenshots.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Authenticated users may upload to their own folder.
create policy "uploads_insert_self"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may read all upload files (signed URLs are still issued
-- server-side, but RLS allows the service-role + authenticated read paths).
create policy "uploads_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads');

-- Owners may delete their own uploads; admins may delete anything.
create policy "uploads_delete_owner_or_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.profile_role() = 'Admin'
    )
  );
