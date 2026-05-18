create table public.favourite_foods (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  calories     numeric(7,1) not null,
  protein_g    numeric(6,1) not null default 0,
  fibre_g      numeric(6,1) not null default 0,
  carbs_g      numeric(6,1) not null default 0,
  fat_g        numeric(6,1) not null default 0,
  usage_count  int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index favourite_foods_user_usage on public.favourite_foods (user_id, usage_count desc);

create trigger favourite_foods_updated_at
  before update on public.favourite_foods
  for each row execute procedure public.set_updated_at();

alter table public.favourite_foods enable row level security;

create policy "Users can view own favourites"   on public.favourite_foods for select using (auth.uid() = user_id);
create policy "Users can insert own favourites" on public.favourite_foods for insert with check (auth.uid() = user_id);
create policy "Users can update own favourites" on public.favourite_foods for update using (auth.uid() = user_id);
create policy "Users can delete own favourites" on public.favourite_foods for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.favourite_foods to authenticated;
