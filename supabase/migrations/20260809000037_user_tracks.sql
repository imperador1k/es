-- ============================================================
-- USER TRACKS - Música própria do utilizador (Focus + Study Rooms)
-- Escola+ App
-- ============================================================

-- 1. Tabela de músicas do utilizador
CREATE TABLE IF NOT EXISTS user_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_tracks_user_id ON user_tracks(user_id);

-- 2. RLS
ALTER TABLE user_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own tracks" ON user_tracks;
CREATE POLICY "Users view own tracks" ON user_tracks
    FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users insert own tracks" ON user_tracks;
CREATE POLICY "Users insert own tracks" ON user_tracks
    FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users delete own tracks" ON user_tracks;
CREATE POLICY "Users delete own tracks" ON user_tracks
    FOR DELETE USING ( auth.uid() = user_id );

-- ============================================================
-- MUSIC BUCKET - Storage para as músicas
-- ============================================================

-- 3. Criar bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 4. Políticas do bucket
DROP POLICY IF EXISTS "Authenticated users can upload music" ON storage.objects;
CREATE POLICY "Authenticated users can upload music"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'music' );

DROP POLICY IF EXISTS "Public can view music" ON storage.objects;
CREATE POLICY "Public can view music"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'music' );

DROP POLICY IF EXISTS "Users can delete music" ON storage.objects;
CREATE POLICY "Users can delete music"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'music' );
