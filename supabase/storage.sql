create policy "Authenticated can upload covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cover');

create policy "Owners can replace covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'cover' and owner_id = (auth.uid())::text);

create policy "Owners can delete orphaned covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cover'
    and owner_id = (auth.uid())::text
    and public.cover_is_orphaned(name)
  );
