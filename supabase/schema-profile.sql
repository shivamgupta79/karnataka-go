-- schema-profile.sql
-- Run AFTER schema.sql and schema-social.sql. Safe to re-run (all guarded).
-- avatar_url and bio already exist in profiles from schema.sql — do NOT re-add.

-- 1. Add privacy_settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb
  DEFAULT '{"shareEmail":false,"sharePhone":false,"showQR":true}'::jsonb;

-- 2. KYC verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id            bigserial PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  doc_type      text        NOT NULL CHECK (doc_type IN ('aadhaar', 'pan', 'passport')),
  storage_path  text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'verified', 'rejected')),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  UNIQUE (user_id, doc_type)
);

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- User can read own KYC records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kyc_verifications' AND policyname = 'own kyc read'
  ) THEN
    EXECUTE 'CREATE POLICY "own kyc read" ON kyc_verifications
      FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END $$;

-- User can insert own KYC records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kyc_verifications' AND policyname = 'own kyc insert'
  ) THEN
    EXECUTE 'CREATE POLICY "own kyc insert" ON kyc_verifications
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- User can update own KYC records (re-upload)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kyc_verifications' AND policyname = 'own kyc update'
  ) THEN
    EXECUTE 'CREATE POLICY "own kyc update" ON kyc_verifications
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- 3. Index for fast KYC lookups by user
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications (user_id);

-- 4. Allow profile insert for new users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'own profile insert'
  ) THEN
    EXECUTE 'CREATE POLICY "own profile insert" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET SETUP (run these manually in Supabase Dashboard → Storage)
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create bucket 'avatars' (public: true, max 2 MB, allowed MIME: image/jpeg,image/png,image/webp)
-- 2. Create bucket 'kyc-docs' (public: false, max 5 MB, allowed MIME: image/jpeg,image/png,image/webp,application/pdf)
--
-- Storage RLS for avatars (public read, own write):
--   CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
--   CREATE POLICY "avatars own write" ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--   CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE USING (
--     bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- Storage RLS for kyc-docs (own read/write only):
--   CREATE POLICY "kyc own read" ON storage.objects FOR SELECT USING (
--     bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
--   CREATE POLICY "kyc own write" ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
--   CREATE POLICY "kyc own update" ON storage.objects FOR UPDATE USING (
--     bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
