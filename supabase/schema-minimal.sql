-- KarnatakaGo — minimal schema needed for Save Trip + Shareable Links.
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- This is safe to run even if you later apply the full schema.sql.

-- ── trips ──────────────────────────────────────────────────────────────────
create table if not exists public.trips (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users on delete cascade,
  preferences jsonb,
  budget      numeric,
  days        int,
  status      text        default 'draft',
  created_at  timestamptz default now()
);

alter table public.trips enable row level security;

-- Allow users to read/write only their own trips
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trips' and policyname = 'own trips'
  ) then
    create policy "own trips" on public.trips
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Allow anyone to read a trip by its ID (needed for shareable links /trip/[id])
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trips' and policyname = 'public read by id'
  ) then
    create policy "public read by id" on public.trips
      for select
      using (true);
  end if;
end $$;
