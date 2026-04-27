-- ============================================
-- STORAGE: Team Avatars Bucket
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Create the bucket for team avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'team-avatars',
    'team-avatars',
    true,  -- Public bucket (images can be viewed without auth)
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for team-avatars bucket

-- Anyone can view avatars (public)
DROP POLICY IF EXISTS "Team avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Team avatars are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-avatars');

-- Team members can upload their own team avatar
DROP POLICY IF EXISTS "Team members can upload avatars" ON storage.objects;
CREATE POLICY "Team members can upload avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'team-avatars' AND
  (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  ))
);

-- Only team admins/owners can update avatars
DROP POLICY IF EXISTS "Team admins can update avatars" ON storage.objects;
CREATE POLICY "Team admins can update avatars"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'team-avatars'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND t.id::text = (storage.foldername(name))[1]
    )
);

-- Only team admins/owners can delete avatars
DROP POLICY IF EXISTS "Team admins can delete avatars" ON storage.objects;
CREATE POLICY "Team admins can delete avatars"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'team-avatars'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND t.id::text = (storage.foldername(name))[1]
    )
);

