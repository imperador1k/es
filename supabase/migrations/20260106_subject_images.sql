-- ============================================================
-- SUBJECT IMAGES - Custom images for subjects
-- Escola+ App
-- ============================================================

-- Add image_url column to user_subjects
ALTER TABLE public.user_subjects 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for documentation
COMMENT ON COLUMN public.user_subjects.image_url IS 'URL of the subject cover image (Unsplash preset or custom upload)';
