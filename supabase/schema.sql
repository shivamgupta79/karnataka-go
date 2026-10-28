-- KarnatakaGo core schema (Supabase / Postgres). Run in the SQL editor or as a migration.
create extension if not exists postgis;
create extension if not exists vector;

-- ---------- identity: contact data is private, profiles are public ----------
create table user_contacts (
  user_id uuid primary key references auth.users on delete cascade,
  phone text, email text
);
alter table user_contacts enable row level security;
-- no policies: only the service role (auth service) can read/write.

create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text, bio text, locale text default 'en'
);
alter table profiles enable row level security;
create policy "profiles readable" on profiles for select using (true);
create policy "own profile write" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- content (read-only for users, written by admins/service role) ----------
create table places (
  id text primary key, name text not null, region text, geom geography(point, 4326),
  category text[], history text, importance text, fee numeric, open_hours text,
  best_season int[], safety_score numeric, embedding vector(1024)
);
create table stays (id text primary key, place_id text references places(id), type text, geom geography(point, 4326), amenities text[], safety_score numeric);
create table prices (
  id bigserial primary key, entity_type text not null, entity_id text not null,
  amount numeric not null, currency text default 'INR', source text not null,
  fetched_at timestamptz not null default now(), confidence numeric default 0.5
);
create index on prices (entity_type, entity_id, fetched_at desc);
create table restaurants (id text primary key, name text, geom geography(point, 4326), speciality text, veg_type text, avg_cost numeric);
create table dishes (id text primary key, name text, region text, description text, veg boolean);
create table photo_spots (id text primary key, geom geography(point, 4326), best_time text, season text, tips text);
create table safety_flags (id bigserial primary key, geom geography, type text, severity int, valid_from timestamptz, valid_to timestamptz);
do $$ declare t text; begin
  foreach t in array array['places','stays','prices','restaurants','dishes','photo_spots','safety_flags'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop; end $$;

-- ---------- trips ----------
create table trips (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users, preferences jsonb, budget numeric, days int, status text default 'draft');
create table trip_items (id bigserial primary key, trip_id uuid references trips on delete cascade, day int, "order" int, entity_type text, entity_id text, start_time time, end_time time, cost numeric);
create table checklists (id bigserial primary key, trip_id uuid references trips on delete cascade, items jsonb);
alter table trips enable row level security; alter table trip_items enable row level security; alter table checklists enable row level security;
create policy "own trips" on trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own trip items" on trip_items for all using (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "own checklists" on checklists for all using (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()));

-- ---------- verified-traveller-only reviews ----------
create table reviews (
  id bigserial primary key, user_id uuid not null references auth.users, stay_id text not null references stays(id),
  trip_id uuid not null references trips, ratings jsonb not null, body text, verified boolean not null default false,
  created_at timestamptz default now(),
  unique (trip_id, stay_id)  -- one review per stay per trip
);
alter table reviews enable row level security;
create policy "verified reviews readable" on reviews for select using (verified);
create policy "review own completed trip" on reviews for insert with check (
  auth.uid() = user_id and exists (
    select 1 from trips t join trip_items i on i.trip_id = t.id
    where t.id = trip_id and t.user_id = auth.uid() and t.status = 'completed'
      and i.entity_type = 'stay' and i.entity_id = stay_id)
);
-- `verified` is flipped to true by a server-side job after booking-proof / location / host confirmation.

create table journals (id bigserial primary key, user_id uuid references auth.users, trip_id uuid references trips, tips text, steps text, spent numeric);
alter table journals enable row level security;
create policy "journals readable" on journals for select using (true);
create policy "own journals" on journals for all using (auth.uid() = user_id);

-- ---------- chat: members only ----------
create table conversations (id uuid primary key default gen_random_uuid(), type text check (type in ('dm','group','trip')));
create table conversation_members (conversation_id uuid references conversations on delete cascade, user_id uuid references auth.users, primary key (conversation_id, user_id));
create table messages (id bigserial primary key, conversation_id uuid references conversations on delete cascade, sender_id uuid references auth.users, body text not null, created_at timestamptz default now());
alter table conversations enable row level security; alter table conversation_members enable row level security; alter table messages enable row level security;
create policy "members see conversation" on conversations for select using (exists (select 1 from conversation_members m where m.conversation_id = id and m.user_id = auth.uid()));
create policy "members see members" on conversation_members for select using (exists (select 1 from conversation_members m where m.conversation_id = conversation_members.conversation_id and m.user_id = auth.uid()));
create policy "members read messages" on messages for select using (exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
create policy "members send messages" on messages for insert with check (sender_id = auth.uid() and exists (select 1 from conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
-- Mask phones/emails/links in the server action that inserts messages (see apps/web/lib/mask.ts).

-- ---------- communities ----------
create table communities (id bigserial primary key, name text not null, type text default 'public', owner_id uuid references auth.users);
create table community_members (community_id bigint references communities on delete cascade, user_id uuid references auth.users, role text default 'member' check (role in ('owner','moderator','member')), primary key (community_id, user_id));
alter table communities enable row level security; alter table community_members enable row level security;
create policy "public communities readable" on communities for select using (type = 'public' or owner_id = auth.uid());
create policy "own memberships" on community_members for select using (user_id = auth.uid());
