-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- One row per user; auto-created on sign-up via trigger
-- ============================================================
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  display_name      text,
  age               int check (age > 0 and age < 130),
  height_cm         numeric(5,1) check (height_cm > 0),
  weight_kg         numeric(5,2) check (weight_kg > 0),
  activity_level    text not null default 'moderate'
                    check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal              text not null default 'maintain'
                    check (goal in ('lose','maintain','gain')),
  -- Calculated targets (updated when profile changes)
  calorie_target    int,
  protein_target_g  int,
  fibre_target_g    int not null default 30,
  water_target_ml   int,
  avatar_url        text
);

-- Auto-insert a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- FOOD LOGS
-- ============================================================
create table public.food_logs (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  logged_at        timestamptz not null default now(),
  meal_type        text not null default 'snack'
                   check (meal_type in ('breakfast','lunch','dinner','snack')),
  photo_url        text,
  -- JSON array: [{name, estimated_portion, calories, protein_g, fibre_g, carbs_g, fat_g}]
  foods_identified jsonb not null default '[]'::jsonb,
  calories         numeric(7,1),
  protein_g        numeric(6,1),
  fibre_g          numeric(6,1),
  carbs_g          numeric(6,1),
  fat_g            numeric(6,1),
  prep_method      text,
  ai_suggestion    text,
  notes            text,
  created_at       timestamptz not null default now()
);

create index food_logs_user_date on public.food_logs (user_id, logged_at desc);

-- ============================================================
-- WATER LOGS
-- ============================================================
create table public.water_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  amount_ml   int not null check (amount_ml > 0),
  created_at  timestamptz not null default now()
);

create index water_logs_user_date on public.water_logs (user_id, logged_at desc);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
create table public.activity_logs (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  logged_at         timestamptz not null default now(),
  activity_type     text not null,
  duration_minutes  int not null check (duration_minutes > 0),
  intensity         text not null default 'moderate'
                    check (intensity in ('low','moderate','high')),
  calories_burned   int,
  notes             text,
  created_at        timestamptz not null default now()
);

create index activity_logs_user_date on public.activity_logs (user_id, logged_at desc);

-- ============================================================
-- WORKOUT PLANS
-- ============================================================
create table public.workout_plans (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  days_per_week int not null default 3 check (days_per_week between 1 and 7),
  -- JSON: [{day, exercises: [{name, sets, reps, weight_kg, notes}]}]
  exercises     jsonb not null default '[]'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index workout_plans_user on public.workout_plans (user_id, is_active);

create trigger workout_plans_updated_at
  before update on public.workout_plans
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- MEDITATION LOGS
-- ============================================================
create table public.meditation_logs (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  logged_at         timestamptz not null default now(),
  duration_minutes  int not null check (duration_minutes > 0),
  type              text not null default 'mindfulness'
                    check (type in ('guided','breathwork','body_scan','mindfulness','other')),
  mood_before       int check (mood_before between 1 and 10),
  mood_after        int check (mood_after between 1 and 10),
  notes             text,
  created_at        timestamptz not null default now()
);

create index meditation_logs_user_date on public.meditation_logs (user_id, logged_at desc);

-- ============================================================
-- DAILY NOTES
-- Free-text journal entries (one per day, upsertable)
-- ============================================================
create table public.daily_notes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  note_date     date not null,
  content       text not null,
  mood          int check (mood between 1 and 10),
  energy_level  int check (energy_level between 1 and 10),
  symptoms      text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, note_date)
);

create index daily_notes_user_date on public.daily_notes (user_id, note_date desc);

create trigger daily_notes_updated_at
  before update on public.daily_notes
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY
-- All tables: users can only see and modify their own data
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.food_logs     enable row level security;
alter table public.water_logs    enable row level security;
alter table public.activity_logs enable row level security;
alter table public.workout_plans enable row level security;
alter table public.meditation_logs enable row level security;
alter table public.daily_notes   enable row level security;

-- Profiles
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Food logs
create policy "Users can view own food logs"   on public.food_logs for select using (auth.uid() = user_id);
create policy "Users can insert own food logs" on public.food_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own food logs" on public.food_logs for update using (auth.uid() = user_id);
create policy "Users can delete own food logs" on public.food_logs for delete using (auth.uid() = user_id);

-- Water logs
create policy "Users can view own water logs"   on public.water_logs for select using (auth.uid() = user_id);
create policy "Users can insert own water logs" on public.water_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own water logs" on public.water_logs for delete using (auth.uid() = user_id);

-- Activity logs
create policy "Users can view own activity logs"   on public.activity_logs for select using (auth.uid() = user_id);
create policy "Users can insert own activity logs" on public.activity_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own activity logs" on public.activity_logs for update using (auth.uid() = user_id);
create policy "Users can delete own activity logs" on public.activity_logs for delete using (auth.uid() = user_id);

-- Workout plans
create policy "Users can view own workout plans"   on public.workout_plans for select using (auth.uid() = user_id);
create policy "Users can insert own workout plans" on public.workout_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own workout plans" on public.workout_plans for update using (auth.uid() = user_id);
create policy "Users can delete own workout plans" on public.workout_plans for delete using (auth.uid() = user_id);

-- Meditation logs
create policy "Users can view own meditation logs"   on public.meditation_logs for select using (auth.uid() = user_id);
create policy "Users can insert own meditation logs" on public.meditation_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own meditation logs" on public.meditation_logs for delete using (auth.uid() = user_id);

-- Daily notes
create policy "Users can view own daily notes"   on public.daily_notes for select using (auth.uid() = user_id);
create policy "Users can insert own daily notes" on public.daily_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own daily notes" on public.daily_notes for update using (auth.uid() = user_id);
create policy "Users can delete own daily notes" on public.daily_notes for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET for meal photos
-- ============================================================
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false);

create policy "Users can upload own meal photos"
  on storage.objects for insert
  with check (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own meal photos"
  on storage.objects for select
  using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own meal photos"
  on storage.objects for delete
  using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
