-- ============================================
-- FIX: check_and_award_badges - usar task_submissions
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
    
    -- Contar tarefas completadas (task_submissions com status 'submitted' ou 'graded')
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
