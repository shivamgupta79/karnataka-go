-- Add image_urls column to hotel and food reviews
-- Run in Supabase SQL Editor after schema-prices.sql

ALTER TABLE hotel_reviews ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE food_reviews  ADD COLUMN IF NOT EXISTS image_urls text[];

-- Storage bucket for review images:
-- Go to Supabase dashboard → Storage → New bucket
-- Name: review-images
-- Public: YES (images need to be publicly viewable in review cards)
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 5242880 (5 MB)
