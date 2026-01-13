-- ============================================================
-- FIX SUBJECT IMAGES BUCKET RLS
-- Run this to fix "violates row-level security policy" errors
-- ============================================================

-- 1. Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-images', 'subject-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Drop existing policies to avoid conflicts/stale rules
DROP POLICY IF EXISTS "Authenticated users can upload subject images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view subject images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update subject images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete subject images" ON storage.objects;

-- 3. Re-create Policy: Authenticated users can upload (INSERT)
CREATE POLICY "Authenticated users can upload subject images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'subject-images' );

-- 4. Re-create Policy: Public can view images (SELECT)
CREATE POLICY "Public can view subject images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'subject-images' );

-- 5. Re-create Policy: Authenticated users can update/delete
CREATE POLICY "Users can update subject images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'subject-images' );

CREATE POLICY "Users can delete subject images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'subject-images' );
