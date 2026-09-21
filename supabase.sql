-- Schemat dla aplikacji "Włoski — 250 słów".
-- Wklej całość do Supabase → SQL Editor → Run. Można uruchamiać wielokrotnie.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  username   text not null unique,
  box        jsonb not null default '{}'::jsonb,  -- stary Leitner, zostaje dla migracji
  known      int  not null default 0,             -- ile słów utrwalonych (interwał >= 21 dni)
  updated_at timestamptz not null default now()
);

-- Powtórki rozłożone w czasie (SM-2): słowo -> {e: łatwość, i: interwał, d: dzień powtórki, r: powtórki, l: wpadki}
alter table public.progress add column if not exists srs jsonb not null default '{}'::jsonb;

-- Dzienna aktywność: "RRRR-MM-DD" -> liczba fiszek zrobionych tego dnia
alter table public.progress add column if not exists days jsonb not null default '{}'::jsonb;

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
