create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text check (length(btrim(display_name)) between 1 and 40),
  avatar text check (avatar in ('cat', 'mug', 'owl', 'glasses', 'hedgehog', 'moon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Select own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create function public.claim_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger profile_for_new_account
  after insert on auth.users
  for each row execute function public.claim_profile();

insert into public.profiles (user_id)
select id from auth.users
on conflict do nothing;
