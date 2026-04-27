-- ============================================
-- Sistema de Badges (Conquistas)
-- ============================================

-- Tabela de badges disponíveis
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL, -- Emoji ou nome do ícone
    category TEXT CHECK (category IN ('achievements', 'milestones', 'special', 'secret')),
    condition_type TEXT NOT NULL, -- 'tasks_completed', 'xp_earned', 'streak_days', 'messages_sent', 'first_action', 'time_based'
    condition_value INTEGER DEFAULT 1, -- Valor necessário para desbloquear
    xp_reward INTEGER DEFAULT 0, -- XP ganho ao desbloquear
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de badges desbloqueados por utilizador
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id) -- Evitar duplicados
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_condition_type ON public.badges(condition_type);

-- RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para badges (todos podem ver)
CREATE POLICY "Anyone can view badges" ON public.badges
    FOR SELECT USING (is_active = true);

-- Políticas para user_badges
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert badges" ON public.user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Badges Iniciais
-- ============================================

INSERT INTO public.badges (name, description, icon, category, condition_type, condition_value, xp_reward, rarity) VALUES
-- Achievements
('🎯 Primeira Quest', 'Completaste a tua primeira tarefa!', '🎯', 'achievements', 'tasks_completed', 1, 50, 'common'),
('📚 Estudioso', 'Completaste 10 tarefas', '📚', 'achievements', 'tasks_completed', 10, 100, 'common'),
('🏆 Campeão', 'Completaste 50 tarefas', '🏆', 'achievements', 'tasks_completed', 50, 250, 'rare'),
('👑 Mestre das Quests', 'Completaste 100 tarefas', '👑', 'achievements', 'tasks_completed', 100, 500, 'epic'),

-- XP Milestones
('⚡ Iniciante', 'Atingiste 100 XP', '⚡', 'milestones', 'xp_earned', 100, 25, 'common'),
('🔥 Em Chamas', 'Atingiste 500 XP', '🔥', 'milestones', 'xp_earned', 500, 50, 'common'),
('💎 Elite XP', 'Atingiste 2000 XP', '💎', 'milestones', 'xp_earned', 2000, 150, 'rare'),
('🌟 Lendário', 'Atingiste 5000 XP', '🌟', 'milestones', 'xp_earned', 5000, 300, 'epic'),
('👾 Mestre Supremo', 'Atingiste 10000 XP', '👾', 'milestones', 'xp_earned', 10000, 500, 'legendary'),

-- Special
('🌙 Coruja Noturna', 'Usaste a app depois das 22h', '🌙', 'special', 'time_based', 22, 30, 'common'),
('☀️ Madrugador', 'Usaste a app antes das 7h', '☀️', 'special', 'time_based', 7, 30, 'common'),
('💬 Comunicador', 'Enviaste 50 mensagens', '💬', 'special', 'messages_sent', 50, 75, 'common'),
('🎤 Tagarela', 'Enviaste 200 mensagens', '🎤', 'special', 'messages_sent', 200, 150, 'rare'),

-- Streak (futuro)
('🔥 3 Dias Seguidos', 'Streak de 3 dias', '📆', 'achievements', 'streak_days', 3, 50, 'common'),
('🔥 7 Dias Seguidos', 'Streak de 7 dias', '📅', 'achievements', 'streak_days', 7, 100, 'rare'),
('🔥 30 Dias Seguidos', 'Streak de 30 dias', '🗓️', 'achievements', 'streak_days', 30, 300, 'epic')
ON CONFLICT DO NOTHING;

-- ============================================
-- RPC: check_and_award_badges
-- Verifica e atribui badges automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_tasks_completed INTEGER;
    v_messages_sent INTEGER;
    v_current_hour INTEGER;
    v_badge RECORD;
    v_awarded_badges JSONB := '[]'::jsonb;
    v_xp_gained INTEGER := 0;
BEGIN
    -- Buscar dados do utilizador
    SELECT current_xp INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Contar tarefas completadas (submissions com status 'submitted' ou 'graded')
    SELECT COUNT(*) INTO v_tasks_completed
    FROM task_submissions
    WHERE user_id = p_user_id AND status IN ('submitted', 'graded');
    
    -- Contar mensagens enviadas
    SELECT COUNT(*) INTO v_messages_sent
    FROM messages
    WHERE user_id = p_user_id;
    
    -- Hora atual
    v_current_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Lisbon');
    
    -- Verificar cada badge
    FOR v_badge IN 
        SELECT b.* FROM badges b
        WHERE b.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM user_badges ub 
            WHERE ub.badge_id = b.id AND ub.user_id = p_user_id
        )
    LOOP
        -- Verificar condição
        IF (v_badge.condition_type = 'tasks_completed' AND v_tasks_completed >= v_badge.condition_value)
        OR (v_badge.condition_type = 'xp_earned' AND v_profile.current_xp >= v_badge.condition_value)
        OR (v_badge.condition_type = 'messages_sent' AND v_messages_sent >= v_badge.condition_value)
        OR (v_badge.condition_type = 'time_based' AND v_badge.icon = '🌙' AND v_current_hour >= 22)
        OR (v_badge.condition_type = 'time_based' AND v_badge.icon = '☀️' AND v_current_hour < 7)
        THEN
            -- Atribuir badge
            INSERT INTO user_badges (user_id, badge_id) 
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING;
            
            -- Adicionar à lista de awarded
            v_awarded_badges := v_awarded_badges || jsonb_build_object(
                'id', v_badge.id,
                'name', v_badge.name,
                'icon', v_badge.icon,
                'xp_reward', v_badge.xp_reward
            );
            
            -- Somar XP
            v_xp_gained := v_xp_gained + v_badge.xp_reward;
        END IF;
    END LOOP;
    
    -- Dar XP pelos badges
    IF v_xp_gained > 0 THEN
        UPDATE profiles SET current_xp = current_xp + v_xp_gained WHERE id = p_user_id;
        
        INSERT INTO xp_history (user_id, amount, source)
        VALUES (p_user_id, v_xp_gained, 'badge_unlock');
    END IF;
    
    RETURN jsonb_build_object(
        'badges_awarded', v_awarded_badges,
        'total_xp_gained', v_xp_gained
    );
END;
$$;

-- Permissão
GRANT EXECUTE ON FUNCTION public.check_and_award_badges TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
