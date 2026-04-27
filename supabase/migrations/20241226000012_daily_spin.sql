-- ============================================================
-- DAILY SPIN WHEEL - Roda da Sorte
-- Execute este ficheiro no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna para controlar o Daily Spin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_daily_spin TIMESTAMPTZ;

-- 2. Função RPC para rodar a roda (Lógica no Servidor)
DROP FUNCTION IF EXISTS public.spin_daily_wheel();

CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_spin TIMESTAMPTZ;
    v_random_value INTEGER;
    v_prize_type TEXT;
    v_prize_amount INTEGER;
    v_prize_index INTEGER; -- 0-5 para 6 fatias
    v_message TEXT;
    v_new_xp INTEGER;
    v_new_tier TEXT;
BEGIN
    -- 1. Verificar se já rodou hoje (UTC)
    SELECT last_daily_spin INTO v_last_spin 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF v_last_spin IS NOT NULL AND DATE(v_last_spin AT TIME ZONE 'UTC') = DATE(now() AT TIME ZONE 'UTC') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Já rodaste a roda hoje! Volta amanhã.',
            'next_spin_at', (DATE(now() AT TIME ZONE 'UTC') + INTERVAL '1 day')::text
        );
    END IF;

    -- 2. Sortear prémio com probabilidades definidas
    -- Gera número 0-99
    v_random_value := floor(random() * 100);

    -- Distribuição de prémios (6 fatias) - XP mais baixo, jackpot raro:
    -- Index 0: 5 XP (30%)  - Comum
    -- Index 1: 10 XP (28%) - Comum
    -- Index 2: 15 XP (20%) - Médio
    -- Index 3: 20 XP (12%) - Raro
    -- Index 4: 30 XP (8%)  - Muito Raro
    -- Index 5: JACKPOT 50 XP (2%) - Ultra Raro
    
    IF v_random_value < 30 THEN
        v_prize_index := 0;
        v_prize_amount := 5;
        v_prize_type := 'xp';
        v_message := '+5 XP';
    ELSIF v_random_value < 58 THEN
        v_prize_index := 1;
        v_prize_amount := 10;
        v_prize_type := 'xp';
        v_message := '+10 XP';
    ELSIF v_random_value < 78 THEN
        v_prize_index := 2;
        v_prize_amount := 15;
        v_prize_type := 'xp';
        v_message := '+15 XP';
    ELSIF v_random_value < 90 THEN
        v_prize_index := 3;
        v_prize_amount := 20;
        v_prize_type := 'xp';
        v_message := '+20 XP';
    ELSIF v_random_value < 98 THEN
        v_prize_index := 4;
        v_prize_amount := 30;
        v_prize_type := 'xp';
        v_message := 'SUPER! +30 XP';
    ELSE
        v_prize_index := 5;
        v_prize_amount := 50;
        v_prize_type := 'jackpot';
        v_message := '🎉 JACKPOT! +50 XP';
    END IF;

    -- 3. Atualizar XP e timestamp
    UPDATE public.profiles 
    SET current_xp = current_xp + v_prize_amount,
        last_daily_spin = now()
    WHERE id = auth.uid()
    RETURNING current_xp INTO v_new_xp;

    -- 4. Atualizar tier se necessário
    v_new_tier := CASE
        WHEN v_new_xp >= 50000 THEN 'Elite'
        WHEN v_new_xp >= 25000 THEN 'Diamante'
        WHEN v_new_xp >= 10000 THEN 'Platina'
        WHEN v_new_xp >= 5000 THEN 'Ouro'
        WHEN v_new_xp >= 2000 THEN 'Prata'
        ELSE 'Bronze'
    END;

    UPDATE public.profiles 
    SET current_tier = v_new_tier
    WHERE id = auth.uid() AND current_tier != v_new_tier;

    -- 5. Registar no histórico de XP
    INSERT INTO public.xp_history (user_id, amount, source, description)
    VALUES (auth.uid(), v_prize_amount, 'daily_spin', 'Roda da Sorte: ' || v_message);

    RETURN jsonb_build_object(
        'success', true, 
        'prize_type', v_prize_type,
        'prize_amount', v_prize_amount,
        'prize_index', v_prize_index,
        'message', v_message,
        'new_xp_total', v_new_xp
    );
END;
$$;

-- 3. Grant permission
GRANT EXECUTE ON FUNCTION public.spin_daily_wheel() TO authenticated;

-- ============================================================
-- DONE!
-- ============================================================
