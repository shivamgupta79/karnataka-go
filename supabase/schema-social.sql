-- schema-social.sql
-- Run AFTER schema.sql. Safe to re-run (all guarded).

-- 1. Add title to journals (missing from schema.sql)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS title text;

-- 2. Add description to communities
ALTER TABLE communities ADD COLUMN IF NOT EXISTS description text;

-- 3. Add name to conversations (for group/trip chat labels)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name text;

-- 4. Missing DML policies for communities
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communities' AND policyname = 'auth users create community'
  ) THEN
    EXECUTE 'CREATE POLICY "auth users create community" ON communities
      FOR INSERT WITH CHECK (auth.uid() = owner_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communities' AND policyname = 'owner update community'
  ) THEN
    EXECUTE 'CREATE POLICY "owner update community" ON communities
      FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)';
  END IF;
END $$;

-- 5. Missing DML policies for community_members (join/leave)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_members' AND policyname = 'join community'
  ) THEN
    EXECUTE 'CREATE POLICY "join community" ON community_members
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_members' AND policyname = 'leave community'
  ) THEN
    EXECUTE 'CREATE POLICY "leave community" ON community_members
      FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 6. Missing DML policies for conversations (create)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations' AND policyname = 'members create conversation'
  ) THEN
    EXECUTE 'CREATE POLICY "members create conversation" ON conversations
      FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- 7. Missing DML policies for conversation_members (add self)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_members' AND policyname = 'add self to conversation'
  ) THEN
    EXECUTE 'CREATE POLICY "add self to conversation" ON conversation_members
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- 8. Missing insert policy for journals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'journals' AND policyname = 'own journals insert'
  ) THEN
    EXECUTE 'CREATE POLICY "own journals insert" ON journals
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- 9. Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_members_user
  ON conversation_members (user_id);

CREATE INDEX IF NOT EXISTS idx_community_members_user
  ON community_members (user_id);

CREATE INDEX IF NOT EXISTS idx_journals_user
  ON journals (user_id);

CREATE INDEX IF NOT EXISTS idx_journals_trip
  ON journals (trip_id);
