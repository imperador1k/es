-- ============================================
-- STUDY ROOMS V2 - Custom Room Creation
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Adicionar novas colunas à tabela study_rooms
ALTER TABLE public.study_rooms 
ADD COLUMN IF NOT EXISTS music_url text,
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#1F2937',
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password text;

-- 2. Atualizar política para permitir criação de salas
DROP POLICY IF EXISTS "Create rooms" ON public.study_rooms;

CREATE POLICY "Create custom rooms" ON public.study_rooms 
    FOR INSERT WITH CHECK (
        auth.uid() = created_by
        AND is_custom = true
        -- Limite de 1 sala ativa por user
        AND NOT EXISTS (
            SELECT 1 FROM public.study_rooms 
            WHERE created_by = auth.uid() 
            AND is_custom = true
        )
    );

-- 3. Política para atualizar/apagar próprias salas
CREATE POLICY "Manage own rooms" ON public.study_rooms 
    FOR ALL USING (created_by = auth.uid());

-- 4. Função para criar sala personalizada
CREATE OR REPLACE FUNCTION public.create_custom_room(
    p_name text,
    p_description text DEFAULT NULL,
    p_emoji text DEFAULT '📚',
    p_theme text DEFAULT 'default',
    p_music_url text DEFAULT NULL,
    p_background_color text DEFAULT '#1F2937',
    p_password text DEFAULT NULL,
    p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room_id uuid;
    v_existing_room uuid;
BEGIN
    -- Verificar se já tem uma sala ativa
    SELECT id INTO v_existing_room 
    FROM study_rooms 
    WHERE created_by = auth.uid() AND is_custom = true;
    
    IF v_existing_room IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Já tens uma sala ativa. Apaga-a primeiro.'
        );
    END IF;
    
    -- Criar a sala
    INSERT INTO study_rooms (
        name, description, emoji, theme, 
        music_url, background_color, is_custom, password,
        team_id, created_by, is_public, max_participants
    ) VALUES (
        p_name, p_description, p_emoji, p_theme,
        p_music_url, p_background_color, true, p_password,
        p_team_id, auth.uid(), 
        (p_team_id IS NULL AND p_password IS NULL), -- Pública se não tiver equipa nem password
        10 -- Limite de 10 para salas custom
    )
    RETURNING id INTO v_room_id;
    
    -- Entrar na sala automaticamente
    DELETE FROM study_room_participants WHERE user_id = auth.uid();
    INSERT INTO study_room_participants (room_id, user_id)
    VALUES (v_room_id, auth.uid());
    
    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_id
    );
END;
$$;

-- 5. Função para entrar em sala com password
CREATE OR REPLACE FUNCTION public.join_study_room_with_password(
    p_room_id uuid,
    p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room study_rooms;
    v_count integer;
BEGIN
    -- Verificar se sala existe
    SELECT * INTO v_room FROM study_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sala não encontrada');
    END IF;
    
    -- Verificar password
    IF v_room.password IS NOT NULL AND v_room.password != p_password THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password incorreta');
    END IF;
    
    -- Verificar limite de participantes
    SELECT COUNT(*) INTO v_count FROM study_room_participants WHERE room_id = p_room_id;
    IF v_count >= v_room.max_participants THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sala cheia');
    END IF;
    
    -- Sair de outras salas primeiro
    DELETE FROM study_room_participants WHERE user_id = auth.uid();
    
    -- Entrar na nova sala
    INSERT INTO study_room_participants (room_id, user_id)
    VALUES (p_room_id, auth.uid())
    ON CONFLICT (room_id, user_id) DO UPDATE SET 
        joined_at = now(),
        last_active = now(),
        status = 'focusing';
    
    RETURN jsonb_build_object('success', true, 'room', row_to_json(v_room));
END;
$$;

-- 6. Função para apagar própria sala
CREATE OR REPLACE FUNCTION public.delete_my_room()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room_id uuid;
BEGIN
    -- Encontrar sala do user
    SELECT id INTO v_room_id 
    FROM study_rooms 
    WHERE created_by = auth.uid() AND is_custom = true;
    
    IF v_room_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não tens sala para apagar');
    END IF;
    
    -- Remover todos os participantes
    DELETE FROM study_room_participants WHERE room_id = v_room_id;
    
    -- Apagar a sala
    DELETE FROM study_rooms WHERE id = v_room_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Atualizar função de limpeza para incluir salas custom vazias
CREATE OR REPLACE FUNCTION public.cleanup_empty_custom_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Apagar salas custom vazias (sem participantes há mais de 5 min)
    DELETE FROM study_rooms
    WHERE is_custom = true
    AND id NOT IN (
        SELECT DISTINCT room_id FROM study_room_participants
    )
    AND created_at < now() - interval '5 minutes';
    
    -- Também limpar participantes inativos
    DELETE FROM study_room_participants
    WHERE last_active < now() - interval '15 minutes';
END;
$$;

-- 8. Grants
GRANT EXECUTE ON FUNCTION public.create_custom_room(text, text, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_room_with_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_room() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_empty_custom_rooms() TO authenticated;

-- ============================================
-- DONE!
-- ============================================
