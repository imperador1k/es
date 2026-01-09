-- =============================================
-- 1. ADD COLUMNS TO PROFILES IF NOT EXIST
-- =============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_longest INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_date DATE;

-- =============================================
-- 2. CREATE THE UPDATE_STREAK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_streak()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_user_id UUID;
    v_today DATE;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get Today's date (server time, effectively UTC usually, but stable)
    v_today := CURRENT_DATE;

    -- Get current profile data
    SELECT 
        last_streak_date, 
        streak_current, 
        streak_longest
    INTO 
        v_last_date, 
        v_current_streak, 
        v_longest_streak
    FROM public.profiles
    WHERE id = v_user_id;

    -- Initialize if null
    IF v_current_streak IS NULL THEN v_current_streak := 0; END IF;
    IF v_longest_streak IS NULL THEN v_longest_streak := 0; END IF;

    -- SCENARIO A: Already updated today
    IF v_last_date = v_today THEN
        RETURN; -- Do nothing
    END IF;

    -- SCENARIO B: Updated Yesterday (Consecutive)
    -- If last_date was yesterday (today - 1)
    IF v_last_date = (v_today - 1) THEN
        v_current_streak := v_current_streak + 1;
    
    -- SCENARIO C: Missed a day (or first time)
    ELSE
        -- Reset to 1 (Today counts as day 1)
        v_current_streak := 1;
    END IF;

    -- Update Longest Streak
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update the record
    UPDATE public.profiles
    SET 
        streak_current = v_current_streak,
        streak_longest = v_longest_streak,
        last_streak_date = v_today
    WHERE id = v_user_id;
    
END;
$$;
