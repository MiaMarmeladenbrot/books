create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (user_id) on delete cascade,
  book_id uuid references public.books on delete set null,
  title text not null check (length(btrim(title)) between 1 and 300),
  authors text[] not null default '{}',
  isbn text,
  note text not null check (length(btrim(note)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index recommendations_recent_idx on public.recommendations (created_at desc);

create unique index recommendations_once_per_book_idx
  on public.recommendations (user_id, book_id) where book_id is not null;

alter table public.recommendations enable row level security;

create policy "Everybody signed in reads the feed"
  on public.recommendations for select to authenticated
  using (true);

create policy "Recommend only one's own book, and only if read or reading"
  on public.recommendations for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.books b
      where b.id = book_id
        and b.user_id = auth.uid()
        and b.status in ('read', 'reading')
    )
  );

create policy "Take back one's own recommendation"
  on public.recommendations for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Select own profile" on public.profiles;

create policy "Everybody signed in sees who is here"
  on public.profiles for select to authenticated
  using (true);
