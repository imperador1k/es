-- ============================================
-- Equip Badges Feature
-- ============================================

-- 1. Add is_equipped column to user_badges
ALTER TABLE public.user_badges 
ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN DEFAULT false;

-- Index for faster queries on profile
CREATE INDEX IF NOT EXISTS idx_user_badges_equipped 
ON public.user_badges(user_id) 
WHERE is_equipped = true;

-- 2. RPC: toggle_badge_equip
-- Toggles the equipped state of a badge.
-- Enforces a limit of 3 equipped badges.
CREATE OR REPLACE FUNCTION public.toggle_badge_equip(badge_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_equipped BOOLEAN;
    v_count INTEGER;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Check if user owns the badge
    IF NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = v_user_id AND badge_id = badge_id_param) THEN
        RAISE EXCEPTION 'Badge not found or not owned by user.';
    END IF;

    -- Get current status
    SELECT is_equipped INTO v_is_equipped
    FROM public.user_badges
    WHERE user_id = v_user_id AND badge_id = badge_id_param;

    -- Logic
    IF v_is_equipped THEN
        -- Unequip (Always allowed)
        UPDATE public.user_badges
        SET is_equipped = false
        WHERE user_id = v_user_id AND badge_id = badge_id_param;
        
        RETURN false; -- Now unequipped
    ELSE
        -- Equip (Check limit)
        SELECT COUNT(*) INTO v_count
        FROM public.user_badges
        WHERE user_id = v_user_id AND is_equipped = true;
        
        IF v_count >= 3 THEN
            RAISE EXCEPTION 'Já tens 3 medalhas equipadas! Desequipa uma primeiro.';
        END IF;

        UPDATE public.user_badges
        SET is_equipped = true
        WHERE user_id = v_user_id AND badge_id = badge_id_param;
        
        RETURN true; -- Now equipped
    END IF;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.toggle_badge_equip TO authenticated;
