-- ============================================
-- SHOP ITEMS - SEED LIMPO (sem duplicados)
-- Apenas MOLDURAS e CONSUMÍVEIS essenciais
-- ============================================

-- Limpar inventário primeiro (por causa da FK)
DELETE FROM user_inventory 
WHERE item_id IN (SELECT id FROM shop_items WHERE type IN ('consumable', 'avatar_frame', 'theme', 'title'));

-- Limpar equipped_frame nos profiles
UPDATE profiles SET equipped_frame = NULL;

-- Agora podemos limpar os shop_items
DELETE FROM shop_items WHERE type IN ('consumable', 'avatar_frame', 'theme', 'title');

-- ============================================
-- CONSUMÍVEIS (is_consumable = true)
-- ============================================

INSERT INTO public.shop_items (name, description, price, type, is_consumable, config, is_active)
VALUES
-- Streak Freeze
('❄️ Congelar Sequência', 'Protege a tua streak por 1 dia. Se falhares, a sequência não é quebrada!', 200, 'consumable', true, 
 '{"effect": "streak_freeze", "duration_days": 1}'::jsonb, true),

('❄️ Pack Freeze x3', '3 congela-sequências. Usa quando precisares!', 500, 'consumable', true, 
 '{"effect": "streak_freeze", "quantity": 3, "duration_days": 1}'::jsonb, true),

-- XP Boost
('⚡ XP Boost 2x', 'Duplica todo o XP ganho durante 24 horas!', 350, 'consumable', true, 
 '{"effect": "xp_multiplier", "multiplier": 2, "duration_hours": 24}'::jsonb, true),

('🔥 XP Boost 3x', 'Triplica todo o XP ganho durante 12 horas!', 500, 'consumable', true, 
 '{"effect": "xp_multiplier", "multiplier": 3, "duration_hours": 12}'::jsonb, true),

-- Time Extension
('⏰ Extensão de Prazo', 'Estende o prazo de uma tarefa em 24 horas.', 150, 'consumable', true, 
 '{"effect": "deadline_extension", "hours": 24}'::jsonb, true);

-- ============================================
-- MOLDURAS DE AVATAR (is_consumable = false)
-- ============================================

INSERT INTO public.shop_items (name, description, price, type, is_consumable, config, is_active)
VALUES
-- Básicas
('🔵 Moldura Safira', 'Uma elegante moldura azul para o teu avatar.', 150, 'avatar_frame', false, 
 '{"border_color": "#3B82F6", "border_width": 4, "glow_color": "rgba(59, 130, 246, 0.5)"}'::jsonb, true),

('🟣 Moldura Ametista', 'Uma misteriosa moldura roxa.', 200, 'avatar_frame', false, 
 '{"border_color": "#A855F7", "border_width": 4, "glow_color": "rgba(168, 85, 247, 0.5)"}'::jsonb, true),

('🟡 Moldura Dourada', 'A cor do sucesso. Brilha como ouro!', 400, 'avatar_frame', false, 
 '{"border_color": "#F59E0B", "border_width": 5, "glow_color": "rgba(245, 158, 11, 0.6)"}'::jsonb, true),

('🔴 Moldura Rubi', 'Vibrante e poderosa.', 300, 'avatar_frame', false, 
 '{"border_color": "#EF4444", "border_width": 4, "glow_color": "rgba(239, 68, 68, 0.5)"}'::jsonb, true),

('🟢 Moldura Esmeralda', 'A cor da natureza e do crescimento.', 250, 'avatar_frame', false, 
 '{"border_color": "#22C55E", "border_width": 4, "glow_color": "rgba(34, 197, 94, 0.5)"}'::jsonb, true),

-- Premium
('⚫ Moldura Obsidiana', 'Escura e elegante. Para os sérios.', 350, 'avatar_frame', false, 
 '{"border_color": "#1F2937", "border_width": 5, "glow_color": "rgba(31, 41, 55, 0.6)"}'::jsonb, true),

('💎 Moldura Cristal', 'Brilhante como cristal. Premium.', 600, 'avatar_frame', false, 
 '{"border_color": "#E0F2FE", "border_width": 5, "glow_color": "rgba(224, 242, 254, 0.7)", "glow": true}'::jsonb, true),

-- Épica
('🌈 Moldura Arco-Íris', 'Todas as cores num só! Animada e especial.', 800, 'avatar_frame', false, 
 '{"border_color": "rainbow", "border_width": 5, "animated": true, "gradient": ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7"]}'::jsonb, true),

-- Lendária  
('👑 Moldura Real', 'Para os reis e rainhas da app. Efeito dourado premium.', 1000, 'avatar_frame', false, 
 '{"border_color": "#FFD700", "border_width": 6, "glow_color": "rgba(255, 215, 0, 0.8)", "glow": true, "legendary": true}'::jsonb, true);

-- ============================================
-- Adicionar colunas de consumível ao profiles (se ainda não existem)
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak_freezes') THEN
        ALTER TABLE public.profiles ADD COLUMN streak_freezes INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp_multiplier') THEN
        ALTER TABLE public.profiles ADD COLUMN xp_multiplier NUMERIC(3,1) DEFAULT 1.0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp_multiplier_expires') THEN
        ALTER TABLE public.profiles ADD COLUMN xp_multiplier_expires TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'equipped_frame') THEN
        ALTER TABLE public.profiles ADD COLUMN equipped_frame UUID DEFAULT NULL;
    END IF;
END $$;

-- ============================================
-- RPC: use_consumable
-- ============================================

CREATE OR REPLACE FUNCTION public.use_consumable(
    p_user_id UUID,
    p_inventory_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_config JSONB;
    v_effect TEXT;
    v_quantity INTEGER;
    v_result_message TEXT;
BEGIN
    SELECT 
        i.id,
        i.item_id,
        i.user_id,
        si.config,
        si.type,
        si.name,
        si.is_consumable
    INTO v_item
    FROM user_inventory i
    JOIN shop_items si ON si.id = i.item_id
    WHERE i.id = p_inventory_id AND i.user_id = p_user_id;
    
    IF v_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item não encontrado no inventário');
    END IF;
    
    IF NOT v_item.is_consumable THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este item não é consumível');
    END IF;
    
    v_config := v_item.config;
    v_effect := v_config->>'effect';
    v_quantity := COALESCE((v_config->>'quantity')::int, 1);
    
    CASE v_effect
        WHEN 'streak_freeze' THEN
            UPDATE profiles 
            SET streak_freezes = COALESCE(streak_freezes, 0) + v_quantity
            WHERE id = p_user_id;
            v_result_message := 'Adicionado ' || v_quantity || ' Streak Freeze(s)!';
            
        WHEN 'xp_multiplier' THEN
            UPDATE profiles SET 
                xp_multiplier = COALESCE((v_config->>'multiplier')::numeric, 2),
                xp_multiplier_expires = now() + ((v_config->>'duration_hours')::int || ' hours')::interval
            WHERE id = p_user_id;
            v_result_message := 'XP Boost ' || (v_config->>'multiplier') || 'x ativado por ' || (v_config->>'duration_hours') || ' horas!';
            
        WHEN 'deadline_extension' THEN
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Extensão de Prazo pronta! Vai a uma tarefa para o usar.',
                'effect', v_effect,
                'pending', true
            );
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Efeito não implementado: ' || v_effect);
    END CASE;
    
    DELETE FROM user_inventory WHERE id = p_inventory_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', v_result_message,
        'effect', v_effect
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_consumable TO authenticated;

-- ============================================
-- RPC: equip_frame
-- Equipar moldura de avatar
-- ============================================

CREATE OR REPLACE FUNCTION public.equip_frame(
    p_user_id UUID,
    p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_owns BOOLEAN;
BEGIN
    -- Verificar se possui o item
    SELECT EXISTS(
        SELECT 1 FROM user_inventory 
        WHERE user_id = p_user_id AND item_id = p_item_id
    ) INTO v_owns;
    
    IF NOT v_owns THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não possuis esta moldura');
    END IF;
    
    -- Buscar item
    SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND type = 'avatar_frame';
    
    IF v_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Moldura não encontrada');
    END IF;
    
    -- Equipar
    UPDATE profiles SET equipped_frame = p_item_id WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Moldura equipada!',
        'frame_config', v_item.config
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_frame TO authenticated;

-- ============================================
-- RPC: unequip_frame
-- Remover moldura
-- ============================================

CREATE OR REPLACE FUNCTION public.unequip_frame(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles SET equipped_frame = NULL WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'message', 'Moldura removida');
END;
$$;

GRANT EXECUTE ON FUNCTION public.unequip_frame TO authenticated;
