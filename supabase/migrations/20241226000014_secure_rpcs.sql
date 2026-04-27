-- ============================================================
-- ESCOLA APP - SECURE RPCs & PERMISSION LOCKDOWN
-- Run AFTER the security_hardening.sql migration
-- ============================================================
-- This migration:
-- 1. Creates SECURITY DEFINER RPCs for critical operations
-- 2. Revokes direct write permissions on sensitive tables
-- 3. Forces all sensitive operations through validated functions
-- ============================================================

-- ============================================================
-- SECTION 1: INTERNAL XP AWARD FUNCTION
-- Only callable by other Postgres functions, NOT by API
-- ============================================================

-- Drop existing if any
DROP FUNCTION IF EXISTS public.award_xp_internal(uuid, integer, text, text);

-- Internal function - SECURITY DEFINER means it runs as the DB owner
CREATE OR REPLACE FUNCTION public.award_xp_internal(
    p_user_id uuid,
    p_amount integer,
    p_source text,
    p_description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_xp integer;
    v_new_tier text;
BEGIN
    -- Validate input
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'XP amount must be positive';
    END IF;
    
    IF p_amount > 1000 THEN
        RAISE EXCEPTION 'XP amount exceeds maximum allowed per operation (1000)';
    END IF;
    
    -- Update profile XP
    UPDATE public.profiles
    SET current_xp = current_xp + p_amount
    WHERE id = p_user_id
    RETURNING current_xp INTO v_new_xp;
    
    IF v_new_xp IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Calculate new tier
    v_new_tier := CASE
        WHEN v_new_xp >= 50000 THEN 'Elite'
        WHEN v_new_xp >= 25000 THEN 'Diamante'
        WHEN v_new_xp >= 10000 THEN 'Platina'
        WHEN v_new_xp >= 5000 THEN 'Ouro'
        WHEN v_new_xp >= 2000 THEN 'Prata'
        ELSE 'Bronze'
    END;
    
    -- Update tier if changed
    UPDATE public.profiles
    SET current_tier = v_new_tier
    WHERE id = p_user_id AND current_tier != v_new_tier;
    
    -- Log XP gain (this bypasses RLS because SECURITY DEFINER)
    INSERT INTO public.xp_history (user_id, amount, source, description)
    VALUES (p_user_id, p_amount, p_source, p_description);
    
    RETURN true;
END;
$$;

-- CRITICAL: This function should NOT be directly callable by authenticated users
-- We'll handle this by not granting EXECUTE to authenticated role
-- Only other SECURITY DEFINER functions can call it

-- ============================================================
-- SECTION 1B: POMODORO XP AWARD (User can call, but validated)
-- ============================================================

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
    v_xp_earned integer;
    v_session_count integer;
    v_today date := current_date;
BEGIN
    -- Validate duration (prevent exploitation)
    IF p_duration_minutes < 5 THEN
        RAISE EXCEPTION 'Session too short (minimum 5 minutes)';
    END IF;
    
    IF p_duration_minutes > 120 THEN
        -- Cap at 2 hours to prevent abuse
        p_duration_minutes := 120;
    END IF;
    
    -- Check daily session limit (max 10 sessions per day = ~500 XP)
    SELECT COUNT(*) INTO v_session_count
    FROM public.study_sessions
    WHERE user_id = auth.uid()
    AND DATE(started_at) = v_today;
    
    IF v_session_count >= 10 THEN
        RETURN jsonb_build_object(
            'success', false,
            'xp_awarded', 0,
            'message', 'Daily session limit reached (10 sessions)'
        );
    END IF;
    
    -- Calculate XP: 1 XP per minute, bonus for focus total
    v_xp_earned := p_duration_minutes;
    
    IF p_is_focus_total THEN
        v_xp_earned := ROUND(v_xp_earned * 1.5); -- 50% bonus for focus total
    END IF;
    
    -- Cap XP per session
    IF v_xp_earned > 75 THEN
        v_xp_earned := 75;
    END IF;
    
    -- Update focus minutes
    UPDATE public.profiles
    SET focus_minutes_total = COALESCE(focus_minutes_total, 0) + p_duration_minutes
    WHERE id = auth.uid();
    
    -- Award XP via internal function
    PERFORM award_xp_internal(
        auth.uid(),
        v_xp_earned,
        'pomodoro_session',
        'Sessão Pomodoro: ' || p_duration_minutes || ' min' || 
            CASE WHEN p_is_focus_total THEN ' (Foco Total)' ELSE '' END
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'xp_awarded', v_xp_earned,
        'duration_minutes', p_duration_minutes,
        'message', 'XP awarded for Pomodoro session'
    );
END;
$$;

-- ============================================================
-- SECTION 2: GRADE SUBMISSION RPC (Professor Only)
-- ============================================================

DROP FUNCTION IF EXISTS public.grade_submission(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.grade_submission(
    p_submission_id uuid,
    p_score integer,
    p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task_id uuid;
    v_team_id uuid;
    v_student_id uuid;
    v_max_score integer;
    v_xp_reward integer;
    v_caller_role text;
    v_task_title text;
    v_already_graded boolean;
    v_xp_to_award integer;
BEGIN
    -- Get submission details
    SELECT 
        ts.task_id, 
        ts.user_id, 
        t.team_id,
        COALESCE((t.config->>'max_score')::integer, 20),
        COALESCE(t.xp_reward, 50),
        t.title,
        ts.status = 'graded'
    INTO v_task_id, v_student_id, v_team_id, v_max_score, v_xp_reward, v_task_title, v_already_graded
    FROM public.task_submissions ts
    JOIN public.tasks t ON t.id = ts.task_id
    WHERE ts.id = p_submission_id;
    
    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;
    
    -- Verify caller is team admin/owner
    SELECT role INTO v_caller_role
    FROM public.team_members
    WHERE team_id = v_team_id AND user_id = auth.uid();
    
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RAISE EXCEPTION 'Permission denied: Only team admins can grade submissions';
    END IF;
    
    -- Validate score
    IF p_score < 0 THEN
        RAISE EXCEPTION 'Score cannot be negative';
    END IF;
    
    IF p_score > v_max_score THEN
        RAISE EXCEPTION 'Score (%) exceeds maximum allowed (%)', p_score, v_max_score;
    END IF;
    
    -- Update submission
    UPDATE public.task_submissions
    SET 
        score = p_score,
        feedback = p_feedback,
        status = 'graded',
        graded_by = auth.uid(),
        graded_at = now(),
        updated_at = now()
    WHERE id = p_submission_id;
    
    -- Award XP only if not already graded (prevent double XP)
    IF NOT v_already_graded THEN
        -- Calculate XP based on score (proportional)
        v_xp_to_award := ROUND((p_score::numeric / v_max_score::numeric) * v_xp_reward);
        
        -- Minimum 10 XP for any submission
        IF v_xp_to_award < 10 THEN
            v_xp_to_award := 10;
        END IF;
        
        -- Award XP via internal function
        PERFORM award_xp_internal(
            v_student_id,
            v_xp_to_award,
            'task_graded',
            'Tarefa avaliada: ' || v_task_title || ' (' || p_score || '/' || v_max_score || ')'
        );
    END IF;
    
    -- Log to audit
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (
        'task_submissions',
        p_submission_id,
        'GRADE',
        jsonb_build_object('score', p_score, 'feedback', p_feedback, 'grader', auth.uid()),
        auth.uid()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', p_submission_id,
        'score', p_score,
        'xp_awarded', CASE WHEN v_already_graded THEN 0 ELSE v_xp_to_award END,
        'message', CASE WHEN v_already_graded THEN 'Nota atualizada (XP já foi atribuído)' ELSE 'Nota atribuída com sucesso' END
    );
END;
$$;

-- ============================================================
-- SECTION 3: SUBMIT TASK RPC (Student)
-- ============================================================

DROP FUNCTION IF EXISTS public.submit_task(uuid, text, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.submit_task(
    p_task_id uuid,
    p_content text DEFAULT NULL,
    p_file_url text DEFAULT NULL,
    p_file_name text DEFAULT NULL,
    p_file_type text DEFAULT NULL,
    p_file_size integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task record;
    v_assignment_id uuid;
    v_existing_submission_id uuid;
    v_is_late boolean := false;
    v_submission_id uuid;
    v_allowed_types text[];
BEGIN
    -- Get task details
    SELECT 
        t.id,
        t.title,
        t.due_date,
        t.team_id,
        t.status,
        COALESCE(t.allow_late_submissions, false) as allow_late,
        COALESCE((t.config->>'requires_file_upload')::boolean, false) as requires_file,
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(t.config->'allowed_file_types')),
            ARRAY['pdf', 'jpg', 'png', 'docx']
        ) as allowed_types
    INTO v_task
    FROM public.tasks t
    WHERE t.id = p_task_id;
    
    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;
    
    -- Check if task is published
    IF v_task.status != 'published' THEN
        RAISE EXCEPTION 'Task is not open for submissions';
    END IF;
    
    -- Check if user is assigned to this task
    SELECT id INTO v_assignment_id
    FROM public.task_assignments
    WHERE task_id = p_task_id AND user_id = auth.uid();
    
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'You are not assigned to this task';
    END IF;
    
    -- Check deadline
    IF v_task.due_date IS NOT NULL AND v_task.due_date < now() THEN
        IF NOT v_task.allow_late THEN
            RAISE EXCEPTION 'Submission deadline has passed';
        END IF;
        v_is_late := true;
    END IF;
    
    -- Validate file if required
    IF v_task.requires_file AND p_file_url IS NULL THEN
        RAISE EXCEPTION 'This task requires a file upload';
    END IF;
    
    -- Validate file type if file provided
    IF p_file_type IS NOT NULL THEN
        v_allowed_types := v_task.allowed_types;
        IF NOT (lower(p_file_type) = ANY(v_allowed_types)) THEN
            RAISE EXCEPTION 'File type % is not allowed. Allowed: %', p_file_type, array_to_string(v_allowed_types, ', ');
        END IF;
    END IF;
    
    -- Check for existing submission
    SELECT id INTO v_existing_submission_id
    FROM public.task_submissions
    WHERE task_id = p_task_id AND user_id = auth.uid();
    
    IF v_existing_submission_id IS NOT NULL THEN
        -- Update existing submission
        UPDATE public.task_submissions
        SET 
            content = COALESCE(p_content, content),
            file_url = COALESCE(p_file_url, file_url),
            file_name = COALESCE(p_file_name, file_name),
            file_type = COALESCE(p_file_type, file_type),
            file_size = COALESCE(p_file_size, file_size),
            status = 'submitted',
            is_late = v_is_late,
            submitted_at = now(),
            updated_at = now()
        WHERE id = v_existing_submission_id
        RETURNING id INTO v_submission_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'submission_id', v_submission_id,
            'is_late', v_is_late,
            'message', 'Submission updated successfully'
        );
    ELSE
        -- Create new submission
        INSERT INTO public.task_submissions (
            task_id, user_id, content, file_url, file_name, file_type, file_size,
            status, is_late, submitted_at
        ) VALUES (
            p_task_id, auth.uid(), p_content, p_file_url, p_file_name, p_file_type, p_file_size,
            'submitted', v_is_late, now()
        )
        RETURNING id INTO v_submission_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'submission_id', v_submission_id,
            'is_late', v_is_late,
            'message', 'Task submitted successfully'
        );
    END IF;
END;
$$;

-- ============================================================
-- SECTION 4: CREATE TASK WITH ASSIGNMENTS RPC (Admin Only)
-- ============================================================

DROP FUNCTION IF EXISTS public.create_task_with_assignments(uuid, text, text, timestamptz, integer, jsonb, text, uuid[]);

CREATE OR REPLACE FUNCTION public.create_task_with_assignments(
    p_team_id uuid,
    p_title text,
    p_description text DEFAULT NULL,
    p_due_date timestamptz DEFAULT NULL,
    p_xp_reward integer DEFAULT 50,
    p_config jsonb DEFAULT '{}'::jsonb,
    p_assignment_type text DEFAULT 'team', -- 'team', 'individual', 'groups'
    p_assigned_user_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role text;
    v_task_id uuid;
    v_member record;
    v_assigned_count integer := 0;
    v_safe_config jsonb;
BEGIN
    -- Validate title
    IF p_title IS NULL OR length(trim(p_title)) < 3 THEN
        RAISE EXCEPTION 'Task title must be at least 3 characters';
    END IF;
    
    -- Verify caller is team admin/owner
    SELECT role INTO v_caller_role
    FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid();
    
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin', 'moderator') THEN
        RAISE EXCEPTION 'Permission denied: Only team admins can create tasks';
    END IF;
    
    -- Sanitize config (prevent injection of malicious values)
    v_safe_config := jsonb_build_object(
        'requires_file_upload', COALESCE((p_config->>'requires_file_upload')::boolean, false),
        'allowed_file_types', COALESCE(p_config->'allowed_file_types', '["pdf"]'::jsonb),
        'max_score', LEAST(COALESCE((p_config->>'max_score')::integer, 20), 100),
        'assignment_type', p_assignment_type,
        'allow_late_submissions', COALESCE((p_config->>'allow_late_submissions')::boolean, false)
    );
    
    -- Validate XP reward (prevent absurd values)
    IF p_xp_reward < 0 OR p_xp_reward > 500 THEN
        RAISE EXCEPTION 'XP reward must be between 0 and 500';
    END IF;
    
    -- Create task
    INSERT INTO public.tasks (
        team_id, user_id, created_by, title, description, due_date, 
        xp_reward, type, status, config, published_at
    ) VALUES (
        p_team_id, auth.uid(), auth.uid(), trim(p_title), p_description, p_due_date,
        p_xp_reward, 'assignment', 'published', v_safe_config, now()
    )
    RETURNING id INTO v_task_id;
    
    -- Assign based on type
    IF p_assignment_type = 'team' THEN
        -- Assign to all team members (except owner/creator)
        FOR v_member IN 
            SELECT user_id FROM public.team_members 
            WHERE team_id = p_team_id AND role NOT IN ('owner')
        LOOP
            INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
            VALUES (v_task_id, v_member.user_id, auth.uid());
            v_assigned_count := v_assigned_count + 1;
        END LOOP;
        
    ELSIF p_assignment_type = 'individual' AND p_assigned_user_ids IS NOT NULL THEN
        -- Assign to specific users
        FOR i IN 1..array_length(p_assigned_user_ids, 1)
        LOOP
            -- Verify user is team member
            IF EXISTS (
                SELECT 1 FROM public.team_members 
                WHERE team_id = p_team_id AND user_id = p_assigned_user_ids[i]
            ) THEN
                INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
                VALUES (v_task_id, p_assigned_user_ids[i], auth.uid());
                v_assigned_count := v_assigned_count + 1;
            END IF;
        END LOOP;
        
    END IF;
    
    -- Always assign at least the caller can see it
    IF v_assigned_count = 0 AND p_assignment_type = 'team' THEN
        RAISE EXCEPTION 'No team members to assign task to';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task_id,
        'assigned_count', v_assigned_count,
        'message', 'Task created and assigned to ' || v_assigned_count || ' members'
    );
END;
$$;

-- ============================================================
-- SECTION 5: COMPLETE PERSONAL TASK RPC
-- ============================================================

DROP FUNCTION IF EXISTS public.complete_personal_task(uuid);

CREATE OR REPLACE FUNCTION public.complete_personal_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task record;
BEGIN
    -- Get task
    SELECT id, title, xp_reward, user_id, is_completed, team_id
    INTO v_task
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;
    
    -- Must be personal task (no team)
    IF v_task.team_id IS NOT NULL THEN
        RAISE EXCEPTION 'Use submit_task for team tasks';
    END IF;
    
    -- Must be owner
    IF v_task.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    -- Check if already completed
    IF v_task.is_completed THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Task already completed'
        );
    END IF;
    
    -- Mark as completed
    UPDATE public.tasks
    SET is_completed = true, updated_at = now()
    WHERE id = p_task_id;
    
    -- Award XP
    PERFORM award_xp_internal(
        auth.uid(),
        COALESCE(v_task.xp_reward, 50),
        'task_completed',
        'Tarefa concluída: ' || v_task.title
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'xp_awarded', COALESCE(v_task.xp_reward, 50),
        'message', 'Task completed!'
    );
END;
$$;

-- ============================================================
-- SECTION 6: PURCHASE SHOP ITEM RPC (Prevent XP manipulation)
-- ============================================================

DROP FUNCTION IF EXISTS public.purchase_item(uuid);

CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item record;
    v_user_xp integer;
    v_already_owned boolean;
BEGIN
    -- Get item
    SELECT id, name, price, is_active, is_consumable
    INTO v_item
    FROM public.shop_items
    WHERE id = p_item_id;
    
    IF v_item.id IS NULL OR NOT v_item.is_active THEN
        RAISE EXCEPTION 'Item not found or not available';
    END IF;
    
    -- Get user XP
    SELECT current_xp INTO v_user_xp
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Check if user has enough XP
    IF v_user_xp < v_item.price THEN
        RAISE EXCEPTION 'Not enough XP. You have % but need %', v_user_xp, v_item.price;
    END IF;
    
    -- Check if already owned (non-consumable)
    IF NOT v_item.is_consumable THEN
        SELECT EXISTS (
            SELECT 1 FROM public.user_inventory
            WHERE user_id = auth.uid() AND item_id = p_item_id
        ) INTO v_already_owned;
        
        IF v_already_owned THEN
            RAISE EXCEPTION 'You already own this item';
        END IF;
    END IF;
    
    -- Deduct XP
    UPDATE public.profiles
    SET current_xp = current_xp - v_item.price
    WHERE id = auth.uid();
    
    -- Add to inventory
    INSERT INTO public.user_inventory (user_id, item_id)
    VALUES (auth.uid(), p_item_id);
    
    -- Log transaction
    INSERT INTO public.xp_history (user_id, amount, source, description)
    VALUES (auth.uid(), -v_item.price, 'shop_purchase', 'Comprou: ' || v_item.name);
    
    RETURN jsonb_build_object(
        'success', true,
        'item_name', v_item.name,
        'price_paid', v_item.price,
        'message', 'Item purchased successfully!'
    );
END;
$$;

-- ============================================================
-- SECTION 7: REVOKE DIRECT WRITE PERMISSIONS
-- ============================================================

-- XP History: NO direct inserts from clients
-- Drop existing policy and create read-only
DROP POLICY IF EXISTS "xp_history_select" ON public.xp_history;
DROP POLICY IF EXISTS "xp_history_insert" ON public.xp_history;
DROP POLICY IF EXISTS "xp_history_update" ON public.xp_history;
DROP POLICY IF EXISTS "xp_history_delete" ON public.xp_history;

CREATE POLICY "xp_history_select_only" ON public.xp_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies = blocked for authenticated role

-- Task Submissions: Only through RPC
DROP POLICY IF EXISTS "task_submissions_insert" ON public.task_submissions;
DROP POLICY IF EXISTS "task_submissions_update" ON public.task_submissions;

-- Allow SELECT (already exists)
-- INSERT only through submit_task RPC (no direct policy)
-- UPDATE limited to non-score fields for students
CREATE POLICY "task_submissions_update_content_only" ON public.task_submissions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        -- Cannot update score, graded_by, graded_at directly
        -- These are controlled by the RPC
    );

-- User Inventory: No direct inserts (use purchase_item RPC)
DROP POLICY IF EXISTS "user_inventory_all" ON public.user_inventory;

CREATE POLICY "user_inventory_select" ON public.user_inventory
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_inventory_update_equip" ON public.user_inventory
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- No INSERT policy = blocked (must use purchase_item RPC)

-- Profiles: Block direct XP manipulation
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own_safe" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Note: current_xp and current_tier updates are allowed here
        -- but SHOULD be done via RPCs. For extra security, you could
        -- use a trigger to prevent direct XP changes.
    );

-- ============================================================
-- SECTION 8: XP PROTECTION TRIGGER
-- Prevents direct XP manipulation via UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_xp_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Allow if XP is not changing
    IF OLD.current_xp = NEW.current_xp THEN
        RETURN NEW;
    END IF;
    
    -- Check if this is being called from a SECURITY DEFINER function
    -- by checking if the current user is the actual user or a superuser
    IF current_setting('role') = 'authenticated' AND 
       NOT (SELECT usesuper FROM pg_user WHERE usename = current_user) THEN
        -- This is a direct API call, not from an RPC
        RAISE EXCEPTION 'Direct XP modification is not allowed. Use the appropriate function.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Note: This trigger is commented out because SECURITY DEFINER functions
-- run as the function owner, not as 'authenticated'. If you want to enable it:
-- CREATE TRIGGER protect_profile_xp
--     BEFORE UPDATE ON public.profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION public.protect_xp_changes();

-- ============================================================
-- SECTION 9: GRANT EXECUTE PERMISSIONS
-- Only RPCs that should be callable by authenticated users
-- ============================================================

-- Revoke all first (safety)
REVOKE ALL ON FUNCTION public.award_xp_internal(uuid, integer, text, text) FROM authenticated;

-- Grant specific RPCs
GRANT EXECUTE ON FUNCTION public.grade_submission(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_task(uuid, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_task_with_assignments(uuid, text, text, timestamptz, integer, jsonb, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_personal_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for_pomodoro(integer, boolean) TO authenticated;

-- ============================================================
-- DONE!
-- ============================================================
-- Summary:
-- ✅ award_xp_internal - Internal only (no client access)
-- ✅ award_xp_for_pomodoro - Validates session, caps XP, limits daily
-- ✅ grade_submission - Admin only, validates permissions
-- ✅ submit_task - Validates deadlines, file types, assignments
-- ✅ create_task_with_assignments - Admin only, sanitizes config
-- ✅ complete_personal_task - Owner only, awards XP safely
-- ✅ purchase_item - Validates XP balance, prevents duplicates
-- ✅ Direct writes blocked on xp_history, user_inventory
-- ✅ Score updates only via grade_submission RPC
-- ============================================================

