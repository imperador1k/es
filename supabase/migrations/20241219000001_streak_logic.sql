CREATE OR REPLACE FUNCTION public.update_streak()
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_today := CURRENT_DATE;

    SELECT last_streak_date, streak_current, streak_longest
    INTO v_last_date, v_current_streak, v_longest_streak
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_current_streak IS NULL THEN v_current_streak := 0; END IF;
    IF v_longest_streak IS NULL THEN v_longest_streak := 0; END IF;

    IF v_last_date = v_today THEN
        RETURN;
    END IF;

    IF v_last_date = (v_today - 1) THEN
        v_current_streak := v_current_streak + 1;
    ELSE
        v_current_streak := 1;
    END IF;

    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    UPDATE public.profiles
    SET 
        streak_current = v_current_streak,
        streak_longest = v_longest_streak,
        last_streak_date = v_today
    WHERE id = v_user_id;
END;
$$;
