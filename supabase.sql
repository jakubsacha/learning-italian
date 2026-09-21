-- Schemat dla aplikacji "Włoski — 250 słów".
-- Wklej całość do Supabase → SQL Editor → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  username   text not null unique,
  box        jsonb not null default '{}'::jsonb,  -- słowo -> poziom 0..3
  known      int  not null default 0,             -- ile słów opanowanych (poziom 3)
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Każda zalogowana osoba widzi wyniki wszystkich (to jest cel: wspólna tablica).
drop policy if exists "progress select" on public.progress;
create policy "progress select" on public.progress
  for select to authenticated using (true);

-- Ale pisać można wyłącznie po swoim wierszu.
drop policy if exists "progress insert own" on public.progress;
create policy "progress insert own" on public.progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "progress update own" on public.progress;
create policy "progress update own" on public.progress
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
