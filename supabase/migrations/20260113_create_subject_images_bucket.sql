-- ============================================================
-- SUBJECT IMAGES BUCKET - Storage for subject covers
-- Escola+ App
-- ============================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-images', 'subject-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload subject images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'subject-images' );

-- 4. Policy: Public can view images
CREATE POLICY "Public can view subject images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'subject-images' );

-- 5. Policy: Authenticated users can update/delete their own images (optional, simplistic for now)
-- Assuming the file name contains the user ID or we treat it loosely for now as public read
CREATE POLICY "Users can update subject images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'subject-images' );

CREATE POLICY "Users can delete subject images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'subject-images' );
