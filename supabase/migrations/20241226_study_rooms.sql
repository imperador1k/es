-- ============================================
-- STUDY ROOMS - Real-time Study Sessions
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela de Salas de Estudo
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    emoji text DEFAULT '📚',
    theme text DEFAULT 'default', -- 'lofi', 'nature', 'rain', 'cafe'
    max_participants integer DEFAULT 20,
    is_public boolean DEFAULT true,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE, -- null = public room
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

-- 2. Tabela de Participantes em Salas (Real-time!)
CREATE TABLE IF NOT EXISTS public.study_room_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    focus_minutes integer DEFAULT 0, -- minutos de foco nesta sessão
    status text DEFAULT 'focusing', -- 'focusing', 'break', 'idle'
    last_active timestamptz DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- 3. Tabela de Reações/Emojis em Salas
CREATE TABLE IF NOT EXISTS public.study_room_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- null = para todos
    emoji text NOT NULL, -- '🔥', '💪', '👋', '☕', '🎉'
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_reactions ENABLE ROW LEVEL SECURITY;

-- Study Rooms: Ver salas públicas ou da própria equipa
CREATE POLICY "View public rooms" ON public.study_rooms 
    FOR SELECT USING (is_public OR team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Create rooms" ON public.study_rooms 
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Participants: Ver todos os participantes de salas que pode ver
CREATE POLICY "View room participants" ON public.study_room_participants 
    FOR SELECT USING (
        room_id IN (SELECT id FROM public.study_rooms WHERE is_public OR team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "Join/Leave rooms" ON public.study_room_participants 
    FOR ALL USING (user_id = auth.uid());

-- Reactions: Ver e criar reações
CREATE POLICY "View reactions" ON public.study_room_reactions 
    FOR SELECT USING (true);

CREATE POLICY "Create reactions" ON public.study_room_reactions 
    FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_reactions;

-- ============================================
-- FUNCÕES RPC
-- ============================================

-- Entrar numa sala
CREATE OR REPLACE FUNCTION public.join_study_room(p_room_id uuid)
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

-- Sair de uma sala
CREATE OR REPLACE FUNCTION public.leave_study_room()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_participation study_room_participants;
BEGIN
    -- Buscar participação atual
    SELECT * INTO v_participation 
    FROM study_room_participants 
    WHERE user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'Não estavas em nenhuma sala');
    END IF;
    
    -- Registar XP se focou mais de 5 minutos
    IF v_participation.focus_minutes >= 5 THEN
        -- Award XP (1 XP por minuto, máx 60)
        PERFORM award_xp_internal(
            auth.uid(), 
            LEAST(v_participation.focus_minutes, 60),
            'study_room',
            'Study Room: ' || v_participation.focus_minutes || ' min'
        );
    END IF;
    
    -- Remover da sala
    DELETE FROM study_room_participants WHERE user_id = auth.uid();
    
    RETURN jsonb_build_object(
        'success', true, 
        'focus_minutes', v_participation.focus_minutes,
        'xp_earned', LEAST(v_participation.focus_minutes, 60)
    );
END;
$$;

-- Atualizar status/tempo de foco (chamado periodicamente pelo cliente)
CREATE OR REPLACE FUNCTION public.update_study_presence(
    p_status text DEFAULT 'focusing',
    p_add_minutes integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE study_room_participants SET
        status = p_status,
        focus_minutes = focus_minutes + p_add_minutes,
        last_active = now()
    WHERE user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não estás numa sala');
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Enviar reação/emoji
CREATE OR REPLACE FUNCTION public.send_room_reaction(
    p_room_id uuid,
    p_emoji text,
    p_to_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se está na sala
    IF NOT EXISTS (
        SELECT 1 FROM study_room_participants 
        WHERE room_id = p_room_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não estás nesta sala');
    END IF;
    
    -- Inserir reação
    INSERT INTO study_room_reactions (room_id, from_user_id, to_user_id, emoji)
    VALUES (p_room_id, auth.uid(), p_to_user_id, p_emoji);
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Obter sala atual do utilizador
CREATE OR REPLACE FUNCTION public.get_my_current_room()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'room', row_to_json(r),
        'participation', row_to_json(p)
    ) INTO v_result
    FROM study_room_participants p
    JOIN study_rooms r ON r.id = p.room_id
    WHERE p.user_id = auth.uid();
    
    RETURN COALESCE(v_result, jsonb_build_object('room', null));
END;
$$;

-- Limpar participantes inativos (>15 min sem atividade)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_room_participants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM study_room_participants
    WHERE last_active < now() - interval '15 minutes';
END;
$$;

-- ============================================
-- GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION public.join_study_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_study_room() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_study_presence(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_room_reaction(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_current_room() TO authenticated;

-- ============================================
-- CRIAR SALAS PÚBLICAS DEFAULT
-- ============================================

INSERT INTO public.study_rooms (name, description, emoji, theme, is_public, created_by)
VALUES 
    ('📚 Sala Geral', 'Sala de estudo para todos', '📚', 'default', true, NULL),
    ('🎧 Lo-Fi Chill', 'Estudar com música Lo-Fi', '🎧', 'lofi', true, NULL),
    ('☕ Café Virtual', 'Ambiente de café para estudar', '☕', 'cafe', true, NULL),
    ('🌧️ Rain Sounds', 'Sons de chuva para concentração', '🌧️', 'rain', true, NULL),
    ('🌲 Natureza', 'Sons da natureza', '🌲', 'nature', true, NULL),
    ('🔥 Exames Finais', 'Para quem está a estudar para exames', '🔥', 'default', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
