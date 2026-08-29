create type book_status as enum ('want_to_read', 'reading', 'read', 'abandoned');
create type book_format as enum ('paperback', 'hardcover', 'ebook', 'audiobook');
create type book_provenance as enum ('bought', 'gift', 'download', 'borrowed');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  subtitle text,
  authors text[] not null default '{}',
  series text,
  series_volume numeric(5, 2),
  isbn text,
  published_year smallint,
  page_count integer check (page_count > 0),
  format book_format,
  provenance book_provenance,
  language text,
  status book_status not null default 'read',
  started_on date,
  finished_on date,
  acquired_on date,
  rating smallint check (rating between 1 and 5),
  notes text,
  cover_path text,
  source_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finished_after_started check (
    started_on is null or finished_on is null or finished_on >= started_on
  )
);

create index books_user_finished_idx on public.books (user_id, finished_on desc nulls last);
create index books_user_status_idx on public.books (user_id, status);
create index books_authors_idx on public.books using gin (authors);

alter table public.books enable row level security;

create policy "Select own books"
  on public.books for select
  using (auth.uid() = user_id);

create policy "Insert own books"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "Update own books"
  on public.books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Delete own books"
  on public.books for delete
  using (auth.uid() = user_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.touch_updated_at();

create function public.cover_is_orphaned(wanted text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (select 1 from public.books where cover_path = wanted);
$$;

revoke execute on function public.cover_is_orphaned(text) from public, anon;
grant execute on function public.cover_is_orphaned(text) to authenticated;

create index books_cover_path_idx on public.books (cover_path)
  where cover_path is not null;
