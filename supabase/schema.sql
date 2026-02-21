create extension if not exists pgcrypto;

-- Feed logs shared by everyone (no auth MVP)
create table if not exists public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  feed_type text not null check (feed_type in ('breast', 'formula')),
  left_minutes integer check (left_minutes is null or left_minutes >= 0),
  right_minutes integer check (right_minutes is null or right_minutes >= 0),
  formula_ml integer check (formula_ml is null or formula_ml >= 0),
  check (
    (feed_type = 'breast' and left_minutes is not null and right_minutes is not null and formula_ml is null)
    or
    (feed_type = 'formula' and formula_ml is not null and left_minutes is null and right_minutes is null)
  )
);

create table if not exists public.app_settings (
  id integer primary key,
  breast_ml_per_minute numeric(6,2) not null default 8,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, breast_ml_per_minute)
values (1, 8)
on conflict (id) do nothing;

alter table public.feed_logs enable row level security;
alter table public.app_settings enable row level security;

-- Public read/write for no-login MVP.
drop policy if exists "Public can read logs" on public.feed_logs;
create policy "Public can read logs"
  on public.feed_logs
  for select
  to anon
  using (true);

drop policy if exists "Public can insert logs" on public.feed_logs;
create policy "Public can insert logs"
  on public.feed_logs
  for insert
  to anon
  with check (true);

drop policy if exists "Public can delete logs" on public.feed_logs;
create policy "Public can delete logs"
  on public.feed_logs
  for delete
  to anon
  using (true);

drop policy if exists "Public can read settings" on public.app_settings;
create policy "Public can read settings"
  on public.app_settings
  for select
  to anon
  using (true);

drop policy if exists "Public can upsert settings" on public.app_settings;
create policy "Public can upsert settings"
  on public.app_settings
  for insert
  to anon
  with check (true);

drop policy if exists "Public can update settings" on public.app_settings;
create policy "Public can update settings"
  on public.app_settings
  for update
  to anon
  using (true)
  with check (true);
