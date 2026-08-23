create policy "Authenticated can read covers"
  on storage.objects for select to authenticated
  using (bucket_id = 'cover');

create policy "Authenticated can upload covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cover');

create policy "Authenticated can replace covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'cover');

create policy "Authenticated can delete covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cover');
