-- ============================================
-- MÓDULO DE EVENTOS TEMPORÁRIOS (Live Ops)
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela de Eventos
CREATE TABLE IF NOT EXISTS public.events_system (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    type text NOT NULL CHECK (type IN ('xp_boost', 'focus_marathon', 'team_clash', 'login_streak', 'special')),
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    banner_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Ativar RLS (Leitura pública, Escrita só Admin)
ALTER TABLE public.events_system ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read events" ON public.events_system;
CREATE POLICY "Public read events" ON public.events_system 
    FOR SELECT USING (true);

-- 2. Função Helper: Qual é o multiplicador atual?
DROP FUNCTION IF EXISTS public.get_current_xp_multiplier();

CREATE OR REPLACE FUNCTION public.get_current_xp_multiplier()
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_multiplier numeric := 1.0;
    v_event_mult numeric;
BEGIN
    SELECT COALESCE((config->>'multiplier')::numeric, 1.0)
    INTO v_event_mult
    FROM public.events_system
    WHERE type = 'xp_boost'
    AND is_active = true
    AND now() BETWEEN start_at AND end_at
    LIMIT 1;

    IF v_event_mult IS NOT NULL THEN
        v_multiplier := v_event_mult;
    END IF;

    RETURN v_multiplier;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_current_xp_multiplier() TO authenticated;

-- 3. Atualizar a função do Pomodoro para usar o Multiplicador
DROP FUNCTION IF EXISTS public.award_xp_for_pomodoro(integer, boolean);

CREATE OR REPLACE FUNCTION public.award_xp_for_pomodoro(
    p_duration_minutes integer,
    p_is_focus_total boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_xp integer;
    v_final_xp integer;
    v_multiplier numeric;
    v_session_count integer;
    v_today date := current_date;
    v_bonus_msg text := '';
BEGIN
    -- Validações
    IF p_duration_minutes < 5 THEN 
        RAISE EXCEPTION 'Sessão muito curta (mínimo 5 minutos)'; 
    END IF;
    
    IF p_duration_minutes > 120 THEN 
        p_duration_minutes := 120; 
    END IF;

    -- Check daily limit
    SELECT COUNT(*) INTO v_session_count 
    FROM public.study_sessions 
    WHERE user_id = auth.uid() AND DATE(started_at) = v_today;
    
    IF v_session_count >= 10 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'xp_awarded', 0,
            'message', 'Limite diário atingido (10 sessões)'
        );
    END IF;
    
    -- CALCULAR XP BASE (1 XP por minuto)
    v_base_xp := p_duration_minutes;
    
    -- 1. Aplicar Foco Total (+50%)
    IF p_is_focus_total THEN
        v_base_xp := ROUND(v_base_xp * 1.5);
        v_bonus_msg := ' (Foco Total)';
    END IF;

    -- 2. Aplicar Multiplicador de Evento
    v_multiplier := public.get_current_xp_multiplier();
    v_final_xp := ROUND(v_base_xp * v_multiplier);

    -- Cap máximo por sessão (75 base, escalado pelo multiplicador)
    IF v_final_xp > ROUND(75 * v_multiplier) THEN 
        v_final_xp := ROUND(75 * v_multiplier); 
    END IF;

    -- Mensagem de bónus de evento
    IF v_multiplier > 1.0 THEN
        v_bonus_msg := v_bonus_msg || ' ⚡' || v_multiplier || 'x Evento!';
    END IF;
    
    -- Atualizar focus minutes
    UPDATE public.profiles 
    SET focus_minutes_total = COALESCE(focus_minutes_total, 0) + p_duration_minutes 
    WHERE id = auth.uid();
    
    -- Award XP via internal function
    PERFORM award_xp_internal(
        auth.uid(),
        v_final_xp,
        'pomodoro_session',
        'Pomodoro ' || p_duration_minutes || 'm' || v_bonus_msg
    );
    
    -- Inserir na tabela de sessões
    INSERT INTO public.study_sessions (user_id, duration_minutes, xp_earned, started_at, ended_at)
    VALUES (auth.uid(), p_duration_minutes, v_final_xp, now() - (p_duration_minutes || ' minutes')::interval, now());

    RETURN jsonb_build_object(
        'success', true, 
        'xp_awarded', v_final_xp, 
        'base_xp', v_base_xp,
        'multiplier', v_multiplier,
        'is_event_bonus', v_multiplier > 1.0,
        'message', 'Ganhaste ' || v_final_xp || ' XP!' || v_bonus_msg
    );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.award_xp_for_pomodoro(integer, boolean) TO authenticated;

-- 4. Função para criar/atualizar evento semanal automaticamente
-- Calcula automaticamente: Domingo 00h → Sábado 23h59
CREATE OR REPLACE FUNCTION public.ensure_weekly_xp_event()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_sunday date;
    v_current_saturday date;
    v_event_exists boolean;
BEGIN
    -- Calcular Domingo desta semana (início)
    -- EXTRACT(DOW from date) retorna 0 para Domingo
    v_current_sunday := current_date - EXTRACT(DOW FROM current_date)::integer;
    
    -- Calcular Sábado desta semana (fim)
    v_current_saturday := v_current_sunday + 6;
    
    -- Verificar se já existe evento para esta semana
    SELECT EXISTS(
        SELECT 1 FROM public.events_system 
        WHERE type = 'xp_boost' 
        AND DATE(start_at) = v_current_sunday
        AND is_active = true
    ) INTO v_event_exists;
    
    -- Se não existe, criar evento da semana
    IF NOT v_event_exists THEN
        -- Desativar eventos de XP boost anteriores
        UPDATE public.events_system 
        SET is_active = false 
        WHERE type = 'xp_boost' AND end_at < now();
        
        -- Inserir novo evento semanal
        INSERT INTO public.events_system (title, description, type, start_at, end_at, config, is_active)
        VALUES (
            '⚡ XP Boost Semanal',
            'Esta semana todo o XP é multiplicado por 2! Estuda mais, ganha mais!',
            'xp_boost',
            v_current_sunday::timestamp + interval '0 hours',
            v_current_saturday::timestamp + interval '23 hours 59 minutes 59 seconds',
            '{"multiplier": 2.0}'::jsonb,
            true
        );
    END IF;
END;
$$;

-- 5. Chamar a função para garantir que existe evento esta semana
SELECT public.ensure_weekly_xp_event();

-- 6. (Opcional) Criar cron job no Supabase para rodar todo Domingo às 00:01
-- No Supabase Dashboard: Database > Extensions > pg_cron
-- Depois: SELECT cron.schedule('weekly-xp-event', '1 0 * * 0', 'SELECT public.ensure_weekly_xp_event()');

-- ============================================
-- HELPER: Obter evento ativo atual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_active_events()
RETURNS SETOF public.events_system
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM public.events_system
    WHERE is_active = true
    AND now() BETWEEN start_at AND end_at
    ORDER BY start_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_xp_event() TO authenticated;

-- ============================================
-- DONE! Evento semanal criado automaticamente
-- ============================================
