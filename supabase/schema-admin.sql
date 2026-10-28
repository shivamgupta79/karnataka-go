-- ═══════════════════════════════════════════════════════════════════════════
--  Admin features schema
--  Run in Supabase → SQL Editor after FULL_SCHEMA.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Banners / Ads ────────────────────────────────────────────────────────────
-- Stores clickable banners and ads shown on the main website.
CREATE TABLE IF NOT EXISTS banners (
  id          bigserial   PRIMARY KEY,
  title       text        NOT NULL,
  subtitle    text,
  cta_label   text,                          -- button text e.g. "Book now"
  url         text,                          -- click destination
  image_url   text,                          -- optional image
  bg_color    text        DEFAULT '#1a6b47', -- hex background
  text_color  text        DEFAULT '#ffffff',
  type        text        NOT NULL DEFAULT 'banner'
                          CHECK (type IN ('banner','ad','announcement')),
  position    text        NOT NULL DEFAULT 'top'
                          CHECK (position IN ('top','bottom','inline')),
  active      boolean     NOT NULL DEFAULT true,
  priority    int         NOT NULL DEFAULT 0, -- higher = shown first
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Everyone can read active banners
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='banners' AND policyname='banners public read') THEN
    CREATE POLICY "banners public read" ON banners FOR SELECT
      USING (active = true AND (starts_at IS NULL OR starts_at <= now())
                             AND (ends_at   IS NULL OR ends_at   >= now()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_banners_active_priority
  ON banners (active, priority DESC, created_at DESC);
