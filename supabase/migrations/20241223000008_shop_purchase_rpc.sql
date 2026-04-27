-- ============================================
-- RPC: purchase_shop_item
-- Transação segura para compra na loja
-- ============================================

CREATE OR REPLACE FUNCTION public.purchase_shop_item(
    p_user_id UUID,
    p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_current_xp INTEGER;
    v_already_owned BOOLEAN;
    v_new_xp INTEGER;
BEGIN
    -- 1. Buscar item
    SELECT id, name, price, type, is_consumable
    INTO v_item
    FROM shop_items
    WHERE id = p_item_id AND is_active = true;
    
    IF v_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item não encontrado ou indisponível');
    END IF;
    
    -- 2. Buscar XP atual do utilizador
    SELECT current_xp INTO v_current_xp
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_current_xp IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Utilizador não encontrado');
    END IF;
    
    -- 3. Verificar se já possui (só para não-consumíveis)
    IF NOT COALESCE(v_item.is_consumable, false) THEN
        SELECT EXISTS(
            SELECT 1 FROM user_inventory 
            WHERE user_id = p_user_id AND item_id = p_item_id
        ) INTO v_already_owned;
        
        IF v_already_owned THEN
            RETURN jsonb_build_object('success', false, 'error', 'Já possuis este item');
        END IF;
    END IF;
    
    -- 4. Verificar XP suficiente
    IF v_current_xp < v_item.price THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'XP insuficiente',
            'required', v_item.price,
            'current', v_current_xp
        );
    END IF;
    
    -- 5. Calcular novo XP
    v_new_xp := v_current_xp - v_item.price;
    
    -- 6. Atualizar XP do utilizador
    UPDATE profiles
    SET current_xp = v_new_xp
    WHERE id = p_user_id;
    
    -- 7. Inserir no inventário
    INSERT INTO user_inventory (user_id, item_id)
    VALUES (p_user_id, p_item_id);
    
    -- 8. Registar no histórico de XP (valor negativo)
    INSERT INTO xp_history (user_id, amount, source)
    VALUES (p_user_id, -v_item.price, 'shop_purchase');
    
    -- 9. Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'item_name', v_item.name,
        'price', v_item.price,
        'new_xp', v_new_xp
    );
END;
$$;

-- Dar permissão para users autenticados
GRANT EXECUTE ON FUNCTION public.purchase_shop_item TO authenticated;
