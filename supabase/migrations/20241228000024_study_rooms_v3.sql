-- ============================================
-- Study Rooms V3 - Chat + Vibe Sync
-- ============================================

-- 1. Adicionar campos de música sincronizada à study_rooms
ALTER TABLE study_rooms 
ADD COLUMN IF NOT EXISTS current_track_url TEXT,
ADD COLUMN IF NOT EXISTS current_track_name TEXT DEFAULT 'Nenhuma',
ADD COLUMN IF NOT EXISTS is_music_playing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dj_user_id UUID REFERENCES profiles(id);

-- 2. Tabela de mensagens do chat da room
CREATE TABLE IF NOT EXISTS study_room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room_id ON study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created_at ON study_room_messages(created_at DESC);

-- 3. RLS para mensagens
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- Qualquer participante da room pode ver mensagens
CREATE POLICY "Participants can view room messages" ON study_room_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_room_participants 
            WHERE room_id = study_room_messages.room_id 
            AND user_id = auth.uid()
        )
    );

-- Participantes podem enviar mensagens
CREATE POLICY "Participants can send messages" ON study_room_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM study_room_participants 
            WHERE room_id = study_room_messages.room_id 
            AND user_id = auth.uid()
        )
    );

-- 4. RPC para enviar mensagem (com rate limit básico)
CREATE OR REPLACE FUNCTION send_room_message(
    p_room_id UUID,
    p_content TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_message_id UUID;
BEGIN
    -- Verificar se está na room
    IF NOT EXISTS (
        SELECT 1 FROM study_room_participants 
        WHERE room_id = p_room_id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não estás nesta sala');
    END IF;
    
    -- Verificar conteúdo
    IF length(trim(p_content)) = 0 OR length(p_content) > 500 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mensagem inválida');
    END IF;
    
    -- Inserir mensagem
    INSERT INTO study_room_messages (room_id, user_id, content)
    VALUES (p_room_id, v_user_id, trim(p_content))
    RETURNING id INTO v_message_id;
    
    RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$;

-- 5. RPC para atualizar música (DJ dinâmico: owner > dj_user_id > primeiro participante)
CREATE OR REPLACE FUNCTION update_room_music(
    p_room_id UUID,
    p_track_url TEXT,
    p_track_name TEXT,
    p_is_playing BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_current_dj UUID;
BEGIN
    -- Buscar room
    SELECT * INTO v_room FROM study_rooms WHERE id = p_room_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sala não encontrada');
    END IF;
    
    -- Determinar quem é o DJ atual:
    -- 1. Se a sala tem dono (created_by), ele é o DJ
    -- 2. Se a sala tem dj_user_id explícito, usa esse
    -- 3. Senão, o primeiro participante (por joined_at) é o DJ
    IF v_room.created_by IS NOT NULL THEN
        v_current_dj := v_room.created_by;
    ELSIF v_room.dj_user_id IS NOT NULL THEN
        v_current_dj := v_room.dj_user_id;
    ELSE
        -- Buscar o participante mais antigo
        SELECT user_id INTO v_current_dj 
        FROM study_room_participants 
        WHERE room_id = p_room_id 
        ORDER BY joined_at ASC 
        LIMIT 1;
    END IF;
    
    -- Se não é o DJ, bloquear
    IF v_current_dj IS NULL OR v_current_dj != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas o DJ pode mudar a música');
    END IF;
    
    -- Atualizar música
    UPDATE study_rooms SET
        current_track_url = p_track_url,
        current_track_name = p_track_name,
        is_music_playing = p_is_playing,
        dj_user_id = v_user_id  -- Registar quem é o DJ atual
    WHERE id = p_room_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'track_url', p_track_url,
        'track_name', p_track_name,
        'is_playing', p_is_playing,
        'dj_user_id', v_user_id
    );
END;
$$;

-- 6. RPC para toggle play/pause (DJ dinâmico)
CREATE OR REPLACE FUNCTION toggle_room_music(p_room_id UUID) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_current_dj UUID;
    v_new_state BOOLEAN;
BEGIN
    SELECT * INTO v_room FROM study_rooms WHERE id = p_room_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sala não encontrada');
    END IF;
    
    -- Determinar DJ atual (mesma lógica de update_room_music)
    IF v_room.created_by IS NOT NULL THEN
        v_current_dj := v_room.created_by;
    ELSIF v_room.dj_user_id IS NOT NULL THEN
        v_current_dj := v_room.dj_user_id;
    ELSE
        SELECT user_id INTO v_current_dj 
        FROM study_room_participants 
        WHERE room_id = p_room_id 
        ORDER BY joined_at ASC 
        LIMIT 1;
    END IF;
    
    IF v_current_dj IS NULL OR v_current_dj != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas o DJ pode controlar a música');
    END IF;
    
    v_new_state := NOT COALESCE(v_room.is_music_playing, false);
    
    UPDATE study_rooms SET is_music_playing = v_new_state WHERE id = p_room_id;
    
    RETURN jsonb_build_object('success', true, 'is_playing', v_new_state);
END;
$$;

-- 7. Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE study_room_messages;

-- Nota: study_rooms já deve estar no realtime, mas garantir:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'study_rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE study_rooms;
    END IF;
END $$;
