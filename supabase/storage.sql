create policy "Covers go to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cover'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or name ~ '^isbn/(\d{9}[\dX]|\d{13})\.jpe?g$'
    )
  );

create policy "Own covers can be deleted"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cover'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "Own folder is listable"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'cover'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
