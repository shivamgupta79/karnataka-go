-- ═══════════════════════════════════════════════════════════════════════════
--  KarnatakaGo — Complete Supabase Schema
--  Paste this entire file into Supabase → SQL Editor → New query → Run
--
--  Safe to re-run: every table uses CREATE TABLE IF NOT EXISTS,
--  every column uses ALTER TABLE … ADD COLUMN IF NOT EXISTS,
--  every policy is guarded with DO $$ … IF NOT EXISTS … END $$.
--
--  Run order is enforced within this single file.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 0 — EXTENSIONS (must be first)
-- ───────────────────────────────────────────────────────────────────────────

-- PostGIS is required for the geography type used in places/stays/restaurants.
-- It is available on all Supabase plans — enable it here before any tables.
CREATE EXTENSION IF NOT EXISTS postgis;

-- NOTE: spatial_ref_sys (created by PostGIS) will show a Supabase security
-- advisor warning about missing RLS. This is a known false positive — the table
-- is owned by supabase_admin and cannot be altered. Dismiss it in the advisor UI:
-- Dashboard → Database → Advisors → Security → spatial_ref_sys → Dismiss.

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1 — CORE IDENTITY
-- ───────────────────────────────────────────────────────────────────────────

-- Private contact data (read only by service role / auth triggers)
CREATE TABLE IF NOT EXISTS user_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  phone   text,
  email   text
);
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only.

-- Public profile (display name, username, avatar)
CREATE TABLE IF NOT EXISTS profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username     text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text NOT NULL,
  avatar_url   text,
  bio          text,
  locale       text DEFAULT 'en'
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles readable') THEN
    CREATE POLICY "profiles readable" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='own profile write') THEN
    CREATE POLICY "own profile write" ON profiles FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='own profile insert') THEN
    CREATE POLICY "own profile insert" ON profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Privacy settings column (added after initial create)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb
  DEFAULT '{"shareEmail":false,"sharePhone":false,"showQR":true}'::jsonb;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2 — KYC / DOCUMENT VERIFICATION
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id           bigserial   PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  doc_type     text        NOT NULL CHECK (doc_type IN ('aadhaar','pan','passport')),
  storage_path text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','verified','rejected')),
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  UNIQUE (user_id, doc_type)
);
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kyc_verifications' AND policyname='own kyc read') THEN
    CREATE POLICY "own kyc read" ON kyc_verifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kyc_verifications' AND policyname='own kyc insert') THEN
    CREATE POLICY "own kyc insert" ON kyc_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kyc_verifications' AND policyname='own kyc update') THEN
    CREATE POLICY "own kyc update" ON kyc_verifications FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications (user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3 — CONTENT (read-only for users, written by service role)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS places (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  region       text,
  geom         geography(point, 4326),
  category     text[],
  history      text,
  importance   text,
  fee          numeric,
  open_hours   text,
  best_season  int[],
  safety_score numeric
);

CREATE TABLE IF NOT EXISTS stays (
  id           text PRIMARY KEY,
  place_id     text REFERENCES places(id),
  type         text,
  geom         geography(point, 4326),
  amenities    text[],
  safety_score numeric
);

CREATE TABLE IF NOT EXISTS prices (
  id           bigserial   PRIMARY KEY,
  entity_type  text        NOT NULL,
  entity_id    text        NOT NULL,
  amount       numeric     NOT NULL,
  currency     text        DEFAULT 'INR',
  source       text        NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  confidence   numeric     DEFAULT 0.5
);
CREATE INDEX IF NOT EXISTS idx_prices_entity_fetched ON prices (entity_type, entity_id, fetched_at DESC);

-- Extend prices with community fields
ALTER TABLE prices ADD COLUMN IF NOT EXISTS bargain_price     numeric;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS user_id           uuid REFERENCES auth.users;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS is_user_submitted boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS restaurants (
  id         text PRIMARY KEY,
  name       text,
  geom       geography(point, 4326),
  speciality text,
  veg_type   text,
  avg_cost   numeric
);

CREATE TABLE IF NOT EXISTS dishes (
  id          text PRIMARY KEY,
  name        text,
  region      text,
  description text,
  veg         boolean
);

CREATE TABLE IF NOT EXISTS photo_spots (
  id        text PRIMARY KEY,
  geom      geography(point, 4326),
  best_time text,
  season    text,
  tips      text
);

CREATE TABLE IF NOT EXISTS safety_flags (
  id         bigserial PRIMARY KEY,
  geom       geography,
  type       text,
  severity   int,
  valid_from timestamptz,
  valid_to   timestamptz
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['places','stays','prices','restaurants','dishes','photo_spots','safety_flags'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY "public read" ON %I FOR SELECT USING (true)', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4 — TRIPS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users,
  preferences jsonb,
  budget      numeric,
  days        int,
  status      text        DEFAULT 'draft',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_items (
  id          bigserial PRIMARY KEY,
  trip_id     uuid      REFERENCES trips ON DELETE CASCADE,
  day         int,
  "order"     int,
  entity_type text,
  entity_id   text,
  start_time  time,
  end_time    time,
  cost        numeric
);

CREATE TABLE IF NOT EXISTS checklists (
  id      bigserial PRIMARY KEY,
  trip_id uuid REFERENCES trips ON DELETE CASCADE,
  items   jsonb
);

ALTER TABLE trips      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trips' AND policyname='own trips') THEN
    CREATE POLICY "own trips" ON trips FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trips' AND policyname='public read by id') THEN
    CREATE POLICY "public read by id" ON trips FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trip_items' AND policyname='own trip items') THEN
    CREATE POLICY "own trip items" ON trip_items FOR ALL
      USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checklists' AND policyname='own checklists') THEN
    CREATE POLICY "own checklists" ON checklists FOR ALL
      USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5 — HOTEL & FOOD REVIEWS (verified travellers only)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hotel_reviews (
  id                 bigserial PRIMARY KEY,
  user_id            uuid      NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entity_id          text      NOT NULL,
  rating             smallint  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              text      NOT NULL,
  body               text,
  price_paid         numeric,
  bargain_price      numeric,
  image_urls         text[],
  verified_traveller boolean   NOT NULL DEFAULT false,
  helpful_count      int       NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE hotel_reviews ADD COLUMN IF NOT EXISTS image_urls text[];

CREATE TABLE IF NOT EXISTS food_reviews (
  id                 bigserial PRIMARY KEY,
  user_id            uuid      NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  restaurant_id      text      NOT NULL,
  dish_name          text,
  rating             smallint  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              text      NOT NULL,
  body               text,
  price_paid         numeric,
  bargain_price      numeric,
  image_urls         text[],
  verified_traveller boolean   NOT NULL DEFAULT false,
  helpful_count      int       NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE food_reviews ADD COLUMN IF NOT EXISTS image_urls text[];

ALTER TABLE hotel_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_reviews  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- hotel_reviews
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotel_reviews' AND policyname='hotel reviews public read verified') THEN
    CREATE POLICY "hotel reviews public read verified" ON hotel_reviews FOR SELECT
      USING (verified_traveller = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotel_reviews' AND policyname='hotel reviews own insert') THEN
    CREATE POLICY "hotel reviews own insert" ON hotel_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotel_reviews' AND policyname='hotel reviews service update') THEN
    CREATE POLICY "hotel reviews service update" ON hotel_reviews FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
  -- food_reviews
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='food_reviews' AND policyname='food reviews public read verified') THEN
    CREATE POLICY "food reviews public read verified" ON food_reviews FOR SELECT
      USING (verified_traveller = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='food_reviews' AND policyname='food reviews own insert') THEN
    CREATE POLICY "food reviews own insert" ON food_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='food_reviews' AND policyname='food reviews service update') THEN
    CREATE POLICY "food reviews service update" ON food_reviews FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hotel_reviews_entity ON hotel_reviews (entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_reviews_restaurant ON food_reviews (restaurant_id, created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6 — PRICE SUBMISSIONS (verified travellers only)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_submissions (
  id            bigserial PRIMARY KEY,
  user_id       uuid      NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entity_type   text      NOT NULL,
  entity_id     text      NOT NULL,
  amount        numeric   NOT NULL,
  bargain_price numeric,
  currency      text      DEFAULT 'INR',
  notes         text,
  status        text      NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE price_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='price_submissions' AND policyname='price submissions own read') THEN
    CREATE POLICY "price submissions own read" ON price_submissions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='price_submissions' AND policyname='price submissions own insert') THEN
    CREATE POLICY "price submissions own insert" ON price_submissions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_submissions_entity
  ON price_submissions (entity_type, entity_id, created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7 — SOCIAL: CONVERSATIONS & MESSAGES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text CHECK (type IN ('dm','group','trip')),
  name text
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              bigserial   PRIMARY KEY,
  conversation_id uuid        REFERENCES conversations ON DELETE CASCADE,
  sender_id       uuid        REFERENCES auth.users,
  body            text        NOT NULL,
  message_type    text        DEFAULT 'text'
                              CHECK (message_type IN ('text','itinerary_share','location','help_request')),
  read_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='members see conversation') THEN
    CREATE POLICY "members see conversation" ON conversations FOR SELECT
      USING (EXISTS (SELECT 1 FROM conversation_members m
                     WHERE m.conversation_id = id AND m.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='members create conversation') THEN
    CREATE POLICY "members create conversation" ON conversations FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_members' AND policyname='members see members') THEN
    CREATE POLICY "members see members" ON conversation_members FOR SELECT
      USING (EXISTS (SELECT 1 FROM conversation_members m
                     WHERE m.conversation_id = conversation_members.conversation_id
                       AND m.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_members' AND policyname='add self to conversation') THEN
    CREATE POLICY "add self to conversation" ON conversation_members FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='members read messages') THEN
    CREATE POLICY "members read messages" ON messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM conversation_members m
                     WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='members send messages') THEN
    CREATE POLICY "members send messages" ON messages FOR INSERT
      WITH CHECK (sender_id = auth.uid() AND EXISTS (
        SELECT 1 FROM conversation_members m
        WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_members_user
  ON conversation_members (user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 8 — SOCIAL: COMMUNITIES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communities (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  description text,
  type        text DEFAULT 'public',
  owner_id    uuid REFERENCES auth.users
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id bigint REFERENCES communities ON DELETE CASCADE,
  user_id      uuid   REFERENCES auth.users,
  role         text   DEFAULT 'member' CHECK (role IN ('owner','moderator','member')),
  PRIMARY KEY  (community_id, user_id)
);

ALTER TABLE communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communities' AND policyname='public communities readable') THEN
    CREATE POLICY "public communities readable" ON communities FOR SELECT
      USING (type = 'public' OR owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communities' AND policyname='auth users create community') THEN
    CREATE POLICY "auth users create community" ON communities FOR INSERT
      WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communities' AND policyname='owner update community') THEN
    CREATE POLICY "owner update community" ON communities FOR UPDATE
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_members' AND policyname='own memberships') THEN
    CREATE POLICY "own memberships" ON community_members FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_members' AND policyname='join community') THEN
    CREATE POLICY "join community" ON community_members FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_members' AND policyname='leave community') THEN
    CREATE POLICY "leave community" ON community_members FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members (user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 9 — SOCIAL: JOURNALS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journals (
  id      bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  trip_id uuid REFERENCES trips,
  title   text,
  tips    text,
  steps   text,
  spent   numeric
);
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journals' AND policyname='journals readable') THEN
    CREATE POLICY "journals readable" ON journals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journals' AND policyname='own journals') THEN
    CREATE POLICY "own journals" ON journals FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journals' AND policyname='own journals insert') THEN
    CREATE POLICY "own journals insert" ON journals FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journals_user  ON journals (user_id);
CREATE INDEX IF NOT EXISTS idx_journals_trip  ON journals (trip_id);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 10 — CHAT MODERATION: BLOCK / REPORT / MUTE
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_blocks (
  id         bigserial PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS message_reports (
  id            bigserial PRIMARY KEY,
  reporter_id   uuid    NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message_id    bigint  NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reason        text    NOT NULL,
  auto_actioned boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mutes (
  id          bigserial PRIMARY KEY,
  muter_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  muted_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  muted_until timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (muter_id, muted_id)
);

ALTER TABLE user_blocks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_blocks' AND policyname='user_blocks_own_read') THEN
    CREATE POLICY user_blocks_own_read ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_blocks' AND policyname='user_blocks_own_insert') THEN
    CREATE POLICY user_blocks_own_insert ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_blocks' AND policyname='user_blocks_own_delete') THEN
    CREATE POLICY user_blocks_own_delete ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='message_reports_own_read') THEN
    CREATE POLICY message_reports_own_read ON message_reports FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_reports' AND policyname='message_reports_own_insert') THEN
    CREATE POLICY message_reports_own_insert ON message_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mutes' AND policyname='user_mutes_own_read') THEN
    CREATE POLICY user_mutes_own_read ON user_mutes FOR SELECT USING (auth.uid() = muter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mutes' AND policyname='user_mutes_own_insert') THEN
    CREATE POLICY user_mutes_own_insert ON user_mutes FOR INSERT WITH CHECK (auth.uid() = muter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mutes' AND policyname='user_mutes_own_delete') THEN
    CREATE POLICY user_mutes_own_delete ON user_mutes FOR DELETE USING (auth.uid() = muter_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker      ON user_blocks     (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter         ON user_mutes      (muter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter ON message_reports (reporter_id);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 11 — VERIFIED REVIEWS (legacy table for trip-based stay reviews)
-- ───────────────────────────────────────────────────────────────────────────
-- Note: stay_id is stored as plain text (no FK to stays) so the table can be
-- used even before stays data is seeded.

CREATE TABLE IF NOT EXISTS reviews (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users,
  stay_id    text        NOT NULL,
  trip_id    uuid        NOT NULL REFERENCES trips,
  ratings    jsonb       NOT NULL,
  body       text,
  verified   boolean     NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trip_id, stay_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='verified reviews readable') THEN
    CREATE POLICY "verified reviews readable" ON reviews FOR SELECT USING (verified);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='own reviews insert') THEN
    CREATE POLICY "own reviews insert" ON reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='own reviews read') THEN
    CREATE POLICY "own reviews read" ON reviews FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — SOS EVENTS (admin monitoring)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sos_events (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users ON DELETE SET NULL,
  lat        double precision,
  lng        double precision,
  message    text,
  status     text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) can insert an SOS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sos_events' AND policyname='sos insert') THEN
    CREATE POLICY "sos insert" ON sos_events FOR INSERT WITH CHECK (true);
  END IF;
  -- Users can see their own SOS events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sos_events' AND policyname='own sos read') THEN
    CREATE POLICY "own sos read" ON sos_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role reads all (used by admin dashboard via service client)
CREATE INDEX IF NOT EXISTS idx_sos_status_time ON sos_events (status, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS  (create these manually in Supabase → Storage)
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Bucket name    │ Public │ Max size │ Allowed MIME types
--  ───────────────┼────────┼──────────┼──────────────────────────────────────
--  avatars        │ YES    │ 2 MB     │ image/jpeg, image/png, image/webp
--  kyc-docs       │ NO     │ 5 MB     │ image/jpeg, image/png, image/webp, application/pdf
--  review-images  │ YES    │ 5 MB     │ image/jpeg, image/png, image/webp
--
-- After creating the buckets run the storage RLS policies below:
-- ═══════════════════════════════════════════════════════════════════════════

-- avatars (public read, owner write)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars public read') THEN
    CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars own write') THEN
    CREATE POLICY "avatars own write" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars own update') THEN
    CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- kyc-docs (private — owner only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='kyc own read') THEN
    CREATE POLICY "kyc own read" ON storage.objects FOR SELECT
      USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='kyc own write') THEN
    CREATE POLICY "kyc own write" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='kyc own update') THEN
    CREATE POLICY "kyc own update" ON storage.objects FOR UPDATE
      USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- review-images (public read, authenticated write)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='review images public read') THEN
    CREATE POLICY "review images public read" ON storage.objects FOR SELECT
      USING (bucket_id = 'review-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='review images auth write') THEN
    CREATE POLICY "review images auth write" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'review-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 13 — BANNERS & ADS (admin-managed, shown on main site)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS banners (
  id          bigserial   PRIMARY KEY,
  title       text        NOT NULL,
  subtitle    text,
  cta_label   text,
  url         text,
  image_url   text,
  bg_color    text        NOT NULL DEFAULT '#1a6b47',
  text_color  text        NOT NULL DEFAULT '#ffffff',
  type        text        NOT NULL DEFAULT 'banner'
                          CHECK (type IN ('banner','ad','announcement')),
  position    text        NOT NULL DEFAULT 'top'
                          CHECK (position IN ('top','bottom','inline')),
  active      boolean     NOT NULL DEFAULT true,
  priority    int         NOT NULL DEFAULT 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Public can read active, in-schedule banners
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='banners' AND policyname='banners public read') THEN
    CREATE POLICY "banners public read" ON banners FOR SELECT
      USING (
        active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at   IS NULL OR ends_at   >= now())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_banners_active_priority
  ON banners (active, priority DESC, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
