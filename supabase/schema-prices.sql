-- KarnatakaGo Prices & Reviews schema
-- Run in the Supabase SQL editor after schema.sql and schema-profile.sql

-- ── 1. Extend prices table ────────────────────────────────────────────────
ALTER TABLE prices ADD COLUMN IF NOT EXISTS bargain_price numeric;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS is_user_submitted boolean DEFAULT false;

-- ── 2. Hotel reviews ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_reviews (
  id                 bigserial PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entity_id          text NOT NULL,
  rating             smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              text NOT NULL,
  body               text,
  price_paid         numeric,
  bargain_price      numeric,
  verified_traveller boolean NOT NULL DEFAULT false,
  helpful_count      int NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);

-- ── 3. Food reviews ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_reviews (
  id                 bigserial PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  restaurant_id      text NOT NULL,
  dish_name          text,
  rating             smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              text NOT NULL,
  body               text,
  price_paid         numeric,
  bargain_price      numeric,
  verified_traveller boolean NOT NULL DEFAULT false,
  helpful_count      int NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now()
);

-- ── 4. Price submissions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_submissions (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  amount       numeric NOT NULL,
  bargain_price numeric,
  currency     text DEFAULT 'INR',
  notes        text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   timestamptz DEFAULT now()
);

-- ── 5. Enable RLS ────────────────────────────────────────────────────────
ALTER TABLE hotel_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_submissions ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS policies ──────────────────────────────────────────────────────

-- hotel_reviews: public read of verified, own insert, service role update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hotel_reviews' AND policyname = 'hotel reviews public read verified'
  ) THEN
    CREATE POLICY "hotel reviews public read verified"
      ON hotel_reviews FOR SELECT
      USING (verified_traveller = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hotel_reviews' AND policyname = 'hotel reviews own insert'
  ) THEN
    CREATE POLICY "hotel reviews own insert"
      ON hotel_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hotel_reviews' AND policyname = 'hotel reviews service update'
  ) THEN
    CREATE POLICY "hotel reviews service update"
      ON hotel_reviews FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- food_reviews: same pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_reviews' AND policyname = 'food reviews public read verified'
  ) THEN
    CREATE POLICY "food reviews public read verified"
      ON food_reviews FOR SELECT
      USING (verified_traveller = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_reviews' AND policyname = 'food reviews own insert'
  ) THEN
    CREATE POLICY "food reviews own insert"
      ON food_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_reviews' AND policyname = 'food reviews service update'
  ) THEN
    CREATE POLICY "food reviews service update"
      ON food_reviews FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- price_submissions: own read, own insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_submissions' AND policyname = 'price submissions own read'
  ) THEN
    CREATE POLICY "price submissions own read"
      ON price_submissions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_submissions' AND policyname = 'price submissions own insert'
  ) THEN
    CREATE POLICY "price submissions own insert"
      ON price_submissions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 7. Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hotel_reviews_entity
  ON hotel_reviews (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_food_reviews_restaurant
  ON food_reviews (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_submissions_entity
  ON price_submissions (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prices_entity
  ON prices (entity_type, entity_id, fetched_at DESC);
