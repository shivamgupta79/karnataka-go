-- ═══════════════════════════════════════════════════════════════
-- Chat moderation schema: message_type column, read_at, and
-- block / report / mute tables with RLS policies.
-- ═══════════════════════════════════════════════════════════════

-- 1. Extend messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text'
    CHECK (message_type IN ('text', 'itinerary_share', 'location', 'help_request'));

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id         bigserial PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- 3. Message reports
CREATE TABLE IF NOT EXISTS message_reports (
  id           bigserial PRIMARY KEY,
  reporter_id  uuid    NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message_id   bigint  NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reason       text    NOT NULL,
  auto_actioned boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- 4. User mutes
CREATE TABLE IF NOT EXISTS user_mutes (
  id          bigserial PRIMARY KEY,
  muter_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  muted_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  muted_until timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (muter_id, muted_id)
);

-- 5. Enable RLS
ALTER TABLE user_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes       ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies (DO $$ guard so re-running is idempotent)
DO $$
BEGIN
  -- ── user_blocks ─────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'user_blocks_own_read'
  ) THEN
    CREATE POLICY user_blocks_own_read ON user_blocks
      FOR SELECT USING (auth.uid() = blocker_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'user_blocks_own_insert'
  ) THEN
    CREATE POLICY user_blocks_own_insert ON user_blocks
      FOR INSERT WITH CHECK (auth.uid() = blocker_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'user_blocks_own_delete'
  ) THEN
    CREATE POLICY user_blocks_own_delete ON user_blocks
      FOR DELETE USING (auth.uid() = blocker_id);
  END IF;

  -- ── message_reports ──────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reports' AND policyname = 'message_reports_own_read'
  ) THEN
    CREATE POLICY message_reports_own_read ON message_reports
      FOR SELECT USING (auth.uid() = reporter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reports' AND policyname = 'message_reports_own_insert'
  ) THEN
    CREATE POLICY message_reports_own_insert ON message_reports
      FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;

  -- ── user_mutes ───────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_mutes' AND policyname = 'user_mutes_own_read'
  ) THEN
    CREATE POLICY user_mutes_own_read ON user_mutes
      FOR SELECT USING (auth.uid() = muter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_mutes' AND policyname = 'user_mutes_own_insert'
  ) THEN
    CREATE POLICY user_mutes_own_insert ON user_mutes
      FOR INSERT WITH CHECK (auth.uid() = muter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_mutes' AND policyname = 'user_mutes_own_delete'
  ) THEN
    CREATE POLICY user_mutes_own_delete ON user_mutes
      FOR DELETE USING (auth.uid() = muter_id);
  END IF;
END $$;

-- 7. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker    ON user_blocks    (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter       ON user_mutes     (muter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter ON message_reports (reporter_id);
